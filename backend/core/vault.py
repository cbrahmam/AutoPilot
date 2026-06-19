import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone

from database import get_db

VAULT_KEY = "autopilot-vault-key-change-in-production"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return uuid.uuid4().hex


def _encrypt(plaintext: str) -> str:
    key = hashlib.sha256(VAULT_KEY.encode()).digest()
    xored = bytes(a ^ b for a, b in zip(plaintext.encode(), key * (len(plaintext) // 32 + 1)))
    mac = hmac.new(key, xored, hashlib.sha256).hexdigest()[:16]
    return base64.urlsafe_b64encode(xored).decode() + "." + mac


def _decrypt(ciphertext: str) -> str:
    try:
        encoded, mac = ciphertext.rsplit(".", 1)
        xored = base64.urlsafe_b64decode(encoded)
        key = hashlib.sha256(VAULT_KEY.encode()).digest()
        expected_mac = hmac.new(key, xored, hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(mac, expected_mac):
            return ""
        plaintext = bytes(a ^ b for a, b in zip(xored, key * (len(xored) // 32 + 1)))
        return plaintext.decode()
    except Exception:
        return ""


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


async def store_key(name: str, service: str, api_key: str, team_id: str = "", created_by: str = "") -> dict:
    key_id = _id()
    encrypted = _encrypt(api_key)
    async with get_db() as db:
        await db.execute(
            "INSERT INTO api_keys (id, name, service, encrypted_key, team_id, created_by, use_count, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
            (key_id, name, service, encrypted, team_id, created_by, _now()),
        )
        await db.commit()
    return {"id": key_id, "name": name, "service": service, "masked_key": mask_key(api_key)}


async def list_keys(team_id: str | None = None) -> list[dict]:
    async with get_db() as db:
        if team_id:
            cursor = await db.execute(
                "SELECT id, name, service, team_id, created_by, use_count, last_used, created_at FROM api_keys WHERE team_id = ? ORDER BY created_at DESC",
                (team_id,),
            )
        else:
            cursor = await db.execute(
                "SELECT id, name, service, team_id, created_by, use_count, last_used, created_at FROM api_keys ORDER BY created_at DESC"
            )
        rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_key_value(key_id: str) -> str | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT encrypted_key FROM api_keys WHERE id = ?", (key_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        await db.execute(
            "UPDATE api_keys SET use_count = use_count + 1, last_used = ? WHERE id = ?",
            (_now(), key_id),
        )
        await db.commit()
    return _decrypt(dict(row)["encrypted_key"])


async def get_key_by_service(service: str) -> str | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, encrypted_key FROM api_keys WHERE service = ? LIMIT 1",
            (service,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        r = dict(row)
        await db.execute(
            "UPDATE api_keys SET use_count = use_count + 1, last_used = ? WHERE id = ?",
            (_now(), r["id"]),
        )
        await db.commit()
    return _decrypt(r["encrypted_key"])


async def delete_key(key_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
        await db.commit()


async def update_key(key_id: str, **fields) -> dict | None:
    if "api_key" in fields:
        fields["encrypted_key"] = _encrypt(fields.pop("api_key"))
    if not fields:
        return None
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [key_id]
    async with get_db() as db:
        await db.execute(f"UPDATE api_keys SET {set_clause} WHERE id = ?", values)
        await db.commit()
        cursor = await db.execute(
            "SELECT id, name, service, team_id, created_by, use_count, last_used, created_at FROM api_keys WHERE id = ?",
            (key_id,),
        )
        row = await cursor.fetchone()
    return dict(row) if row else None
