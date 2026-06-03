from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core.auth import register_user, authenticate_user, create_token, decode_token, get_user_by_id

router = APIRouter()


class RegisterBody(BaseModel):
    email: str
    password: str
    display_name: str = ""


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
async def register(body: RegisterBody):
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    try:
        user = await register_user(body.email, body.password, body.display_name)
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(409, "Email already registered")
        raise HTTPException(500, f"Registration failed: {e}")

    token = create_token(user["id"], user["email"])
    return {"token": token, "user": user}


@router.post("/auth/login")
async def login(body: LoginBody):
    user = await authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {"token": token, "user": user}


@router.get("/auth/me")
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")

    token = auth_header[7:]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    user = await get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(404, "User not found")

    return user
