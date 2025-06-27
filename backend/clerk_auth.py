import os
import httpx
from clerk_backend_api import Clerk
from clerk_backend_api.security import authenticate_request
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, status, Request
from dotenv import load_dotenv

load_dotenv()

clerk = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))

async def get_state(request: Request):
    try:
    # 转换FastAPI Request为httpx Request
        headers = dict(request.headers)
        method = request.method
        url = str(request.url)

        # 创建httpx Request对象
        httpx_request = httpx.Request(method, url, headers=headers)

        # 使用Clerk SDK验证
        request_state = clerk.authenticate_request(
            httpx_request,
            AuthenticateRequestOptions(
                authorized_parties=['http://localhost:3000']
            )
        )

        if not request_state.is_signed_in:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

        return request_state

    except Exception as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Authentication failed: {str(e)}")
