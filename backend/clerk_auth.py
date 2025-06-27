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
    Clerk session token claims (JWT payload):
    - sid (session ID): Unique identifier for the current session
    - sub (user ID): Unique identifier for the current user
    - azp (authorized party): The Origin header from the original Frontend API request, typically the application URL
    - exp (expiration time): Unix timestamp when the token expires, set by Token lifetime JWT template setting
    - fva (factor verification age): Minutes since last verification of first/second factors respectively
    - iat (issued at): Unix timestamp when the token was issued
    - iss (issuer): Frontend API URL of your Clerk instance (dev/prod)
    - nbf (not before): Unix timestamp before which token is invalid, set by Allowed Clock Skew setting
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
