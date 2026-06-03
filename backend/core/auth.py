import hashlib
import hmac
import json
import time
import uuid
import base64
from datetime import datetime, timezone

from database import get_db
from config import settings

SECRET_KEY = "autopilot-secret-change-in-production"
TOKEN_EXPIRY = 86400 * 7  # 7 days


def hash_password(password: str) -> str:
    salt = uuid.uuid4().hex
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${hashed.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, hashed = password_hash.split("$", 1)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return hmac.compare_digest(expected.hex(), hashed)
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + TOKEN_EXPIRY,
    }
    payload_bytes = base64.urlsafe_b64encode(json.dumps(payload).encode())
    sig = hmac.new(SECRET_KEY.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"{payload_bytes.decode()}.{sig}"


def decode_token(token: str) -> dict | None:
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


async def register_user(email: str, password: str, display_name: str = "") -> dict:
    user_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(password)

    async with get_db() as db:
        await db.execute(
            "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, pw_hash, display_name or email.split("@")[0], now),
        )
        await db.commit()

    return {"id": user_id, "email": email, "display_name": display_name or email.split("@")[0]}


async def authenticate_user(email: str, password: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = await cursor.fetchone()

    if not row:
        return None

    user = dict(row)
    if not verify_password(password, user["password_hash"]):
        return None

    return {"id": user["id"], "email": user["email"], "display_name": user["display_name"]}


async def get_user_by_id(user_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute("SELECT id, email, display_name, created_at FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
    return dict(row) if row else None
