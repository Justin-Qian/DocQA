# backend/auth.py
from fastapi import Request, HTTPException, status
from jose import jwt, jwk
from jose.utils import base64url_decode
from dotenv import load_dotenv
import os, requests, time

load_dotenv()
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API")
CLERK_JWKS_URL = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"
AUTHORIZED_PARTIES = {"http://localhost:3000"}          # 允许的 azp，可用逗号分隔写到 .env 并 split


def _get_public_key(token: str):
    """到 Clerk JWKS 中找与 token header.kid 匹配的公钥，并构造成 python-jose 可用对象"""
    jwks = requests.get(CLERK_JWKS_URL, timeout=3).json()["keys"]
    kid   = jwt.get_unverified_header(token)["kid"]
    for key in jwks:
        if key["kid"] == kid:
            return jwk.construct(key)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid key ID")

def _verify_signature_and_decode(token: str):
    """手动验签，再用 jwt.decode 解析 payload"""
    public_key = _get_public_key(token)

    # 手动验签（与 Clerk 文档一致）
    msg, sig_encoded = token.rsplit(".", 1)
    sig_decoded = base64url_decode(sig_encoded.encode())
    if not public_key.verify(msg.encode(), sig_decoded):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Bad signature")

    # 解码 payload（关闭 aud 校验；Clerk 默认不带 aud）
    return jwt.decode(token,
                      public_key.to_pem(),
                      algorithms=["RS256"],
                      options={"verify_aud": False})

def verify_token(token: str):
    """完整校验：签名 + exp/nbf + azp"""
    payload = _verify_signature_and_decode(token)

    now = int(time.time())
    if payload.get("exp", 0) < now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    if payload.get("nbf", 0) > now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token not yet valid")
    if (azp := payload.get("azp")) and azp not in AUTHORIZED_PARTIES:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid origin")

    return payload          # 内含 sub = user_id, sid = session_id 等

# ----------------------- FastAPI 依赖：强制登录 ----------------------------- #
async def require_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Authorization")
    token = auth.split(" ", 1)[1]
    return verify_token(token)
