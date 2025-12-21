from fastapi import HTTPException
from typing import Optional

class APIError(HTTPException):
    """Unified API Error Response"""
    
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: Optional[dict] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "statusCode": status_code
                }
            },
            headers=headers
        )
