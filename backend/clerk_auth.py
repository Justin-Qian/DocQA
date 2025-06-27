import os
import httpx
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, status, Request
from dotenv import load_dotenv

load_dotenv()

clerk = Clerk(bearer_auth=os.getenv('CLERK_SECRET_KEY'))
AUTHORIZED_PARTIES = ['http://localhost:3000']

async def get_user_state(request: Request):
    """
    Get user state from Clerk, return the payload of the request state
    If authentication fails, raise HTTPException with status code 401
    param:
        request: FastAPI Request object
    return:
        request_state.payload: dict, the payload of the request state
    raise:
        HTTPException: if authentication fails
    """
    try:
        #Transform FastAPI Request to httpx Request
        headers = dict(request.headers)
        method = request.method
        url = str(request.url)

        # Create httpx Request object
        httpx_request = httpx.Request(method, url, headers=headers)

        # Verify with Clerk SDK
        request_state = clerk.authenticate_request(
            httpx_request,
            AuthenticateRequestOptions(
                authorized_parties=AUTHORIZED_PARTIES
            )
        )

        # If authentication fails, raise HTTPException with status code 401
        if not request_state.is_signed_in:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

        # Return the payload of the request state
        return request_state.payload

    except Exception as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Authentication failed: {str(e)}")
