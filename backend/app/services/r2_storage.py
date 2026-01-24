"""
Cloudflare R2 Storage Service

Handles image uploads, downloads, and deletion operations with Cloudflare R2.
Uses boto3 S3-compatible API.
"""

import os
import logging
import boto3
from typing import Union, Dict, List, Tuple
from pathlib import Path
from botocore.exceptions import ClientError

# Configure logger
logger = logging.getLogger(__name__)


class R2StorageError(Exception):
    """Custom exception for R2 storage errors"""
    pass


class R2StorageService:
    """Service for managing image storage in Cloudflare R2"""

    def __init__(self):
        """Initialize R2 storage service with environment configuration"""
        # Load configuration from environment
        self.endpoint_url = os.getenv("R2_ENDPOINT_URL")
        self.access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        self.public_url = os.getenv("R2_PUBLIC_URL")

        logger.info(f"Initializing R2 storage service...")
        logger.info(f"Bucket: {self.bucket_name}")
        logger.info(f"Endpoint: {self.endpoint_url}")
        logger.info(f"Public URL: {self.public_url}")

        # Validate required configuration
        required_vars = {
            "R2_ENDPOINT_URL": self.endpoint_url,
            "R2_ACCESS_KEY_ID": self.access_key_id,
            "R2_SECRET_ACCESS_KEY": self.secret_access_key,
            "R2_BUCKET_NAME": self.bucket_name,
            "R2_PUBLIC_URL": self.public_url,
        }

        missing_vars = [name for name, value in required_vars.items() if not value]
        if missing_vars:
            error_msg = f"Missing required environment variable(s): {', '.join(missing_vars)}"
            logger.error(f"❌ {error_msg}")
            raise R2StorageError(error_msg)

        # Initialize S3 client for R2
        try:
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name="auto",  # R2 uses "auto" for region
            )
            logger.info("✅ R2 storage service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 client: {e}")
            raise R2StorageError(f"Failed to initialize S3 client: {e}") from e

    def upload_image(
        self,
        card_id: str,
        image_data: Union[bytes, str, Path],
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload an image to R2 storage

        Args:
            card_id: Card identifier (e.g., "OP01-001")
            image_data: Image data as bytes, file path string, or Path object
            content_type: MIME type of the image (default: image/jpeg)

        Returns:
            str: Public URL of the uploaded image

        Raises:
            R2StorageError: If upload fails
        """
        try:
            # Determine if image_data is a file path or bytes
            if isinstance(image_data, (str, Path)):
                # Read file from path
                file_path = Path(image_data)
                if not file_path.exists():
                    raise R2StorageError(f"Image file not found: {file_path}")
                image_bytes = file_path.read_bytes()
            else:
                # Use bytes directly
                image_bytes = image_data

            # Upload to R2
            key = f"cards/{card_id}.jpg"
            logger.info(f"Uploading to R2: bucket={self.bucket_name}, key={key}, size={len(image_bytes)} bytes")

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_bytes,
                ContentType=content_type,
            )

            logger.info(f"✅ Successfully uploaded {key} to R2")

            # Return public URL
            url = self.get_image_url(card_id)
            logger.info(f"Generated public URL: {url}")
            return url

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"❌ AWS ClientError uploading {card_id}: {error_code} - {error_msg}")
            raise R2StorageError(f"Failed to upload image to R2 (AWS Error {error_code}): {error_msg}") from e
        except Exception as e:
            if isinstance(e, R2StorageError):
                raise
            logger.error(f"❌ Unexpected error uploading {card_id}: {e}", exc_info=True)
            raise R2StorageError(f"Failed to upload image to R2: {str(e)}") from e

    def delete_image(self, card_id: str) -> None:
        """
        Delete an image from R2 storage

        Args:
            card_id: Card identifier (e.g., "OP01-001")

        Raises:
            R2StorageError: If deletion fails
        """
        try:
            key = f"cards/{card_id}.jpg"
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
        except Exception as e:
            raise R2StorageError(f"Failed to delete image from R2: {str(e)}") from e

    def get_image_url(self, card_id: str) -> str:
        """
        Generate public URL for an image

        Args:
            card_id: Card identifier (e.g., "OP01-001")

        Returns:
            str: Public URL of the image
        """
        return f"{self.public_url}/cards/{card_id}.jpg"

    def image_exists(self, card_id: str) -> bool:
        """
        Check if an image exists in R2 storage

        Args:
            card_id: Card identifier (e.g., "OP01-001")

        Returns:
            bool: True if image exists, False otherwise
        """
        try:
            key = f"cards/{card_id}.jpg"
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise R2StorageError(f"Failed to check image existence: {str(e)}") from e
        except Exception as e:
            raise R2StorageError(f"Failed to check image existence: {str(e)}") from e

    def bulk_upload_images(
        self,
        images: List[Tuple[str, Union[bytes, str, Path]]],
        continue_on_error: bool = True,
    ) -> Dict[str, str]:
        """
        Upload multiple images in bulk

        Args:
            images: List of (card_id, image_data) tuples
            continue_on_error: If True, continue uploading even if some fail

        Returns:
            Dict[str, str]: Mapping of card_id to public URL for successful uploads

        Raises:
            R2StorageError: If all uploads fail (only when continue_on_error=False)
        """
        results = {}
        errors = []

        for card_id, image_data in images:
            try:
                url = self.upload_image(card_id, image_data)
                results[card_id] = url
            except Exception as e:
                errors.append((card_id, str(e)))
                if not continue_on_error:
                    raise R2StorageError(
                        f"Bulk upload failed at card {card_id}: {str(e)}"
                    ) from e

        if errors and not continue_on_error:
            error_msg = "; ".join(f"{card_id}: {err}" for card_id, err in errors)
            raise R2StorageError(f"Some uploads failed: {error_msg}")

        return results


# Singleton instance
_r2_storage_instance = None


def get_r2_storage() -> R2StorageService:
    """
    Get singleton instance of R2StorageService

    Returns:
        R2StorageService: Singleton instance

    Raises:
        R2StorageError: If service initialization fails
    """
    global _r2_storage_instance
    if _r2_storage_instance is None:
        _r2_storage_instance = R2StorageService()
    return _r2_storage_instance
