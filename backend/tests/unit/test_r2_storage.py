"""
Unit tests for R2 storage service

Tests image upload, download, and deletion operations with Cloudflare R2.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from io import BytesIO

from app.services.r2_storage import R2StorageService, R2StorageError


class TestR2StorageService:
    """Test suite for R2StorageService"""

    @pytest.fixture
    def mock_s3_client(self):
        """Create mock S3 client"""
        with patch("boto3.client") as mock_boto:
            mock_client = MagicMock()
            mock_boto.return_value = mock_client
            yield mock_client

    @pytest.fixture
    def storage_service(self, mock_s3_client):
        """Create R2StorageService instance with mocked client"""
        with patch.dict(
            "os.environ",
            {
                "R2_ENDPOINT_URL": "https://test.r2.cloudflarestorage.com",
                "R2_ACCESS_KEY_ID": "test_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test-bucket",
                "R2_PUBLIC_URL": "https://test.r2.dev",
            },
        ):
            service = R2StorageService()
            service.s3_client = mock_s3_client
            return service

    def test_init_loads_config_from_env(self):
        """Test that service loads configuration from environment variables"""
        with patch.dict(
            "os.environ",
            {
                "R2_ENDPOINT_URL": "https://test.r2.cloudflarestorage.com",
                "R2_ACCESS_KEY_ID": "test_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test-bucket",
                "R2_PUBLIC_URL": "https://test.r2.dev",
            },
        ):
            with patch("boto3.client"):
                service = R2StorageService()
                assert service.bucket_name == "test-bucket"
                assert service.public_url == "https://test.r2.dev"

    def test_init_raises_error_if_missing_config(self):
        """Test that service raises error if configuration is missing"""
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(R2StorageError, match="Missing required environment variable"):
                R2StorageService()

    def test_upload_image_from_bytes(self, storage_service, mock_s3_client):
        """Test uploading image from bytes"""
        image_data = b"fake image data"
        card_id = "OP01-001"

        result = storage_service.upload_image(card_id, image_data)

        # Verify S3 client was called correctly
        mock_s3_client.put_object.assert_called_once()
        call_kwargs = mock_s3_client.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "test-bucket"
        assert call_kwargs["Key"] == f"cards/{card_id}.jpg"
        assert call_kwargs["Body"] == image_data
        assert call_kwargs["ContentType"] == "image/jpeg"

        # Verify returned URL
        assert result == "https://test.r2.dev/cards/OP01-001.jpg"

    def test_upload_image_from_file_path(self, storage_service, mock_s3_client, tmp_path):
        """Test uploading image from file path"""
        # Create temporary image file
        image_file = tmp_path / "test.jpg"
        image_data = b"fake image data"
        image_file.write_bytes(image_data)

        card_id = "OP01-002"
        result = storage_service.upload_image(card_id, str(image_file))

        # Verify S3 client was called correctly
        mock_s3_client.put_object.assert_called_once()
        call_kwargs = mock_s3_client.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "test-bucket"
        assert call_kwargs["Key"] == f"cards/{card_id}.jpg"
        assert call_kwargs["ContentType"] == "image/jpeg"

        # Verify returned URL
        assert result == "https://test.r2.dev/cards/OP01-002.jpg"

    def test_upload_image_handles_s3_error(self, storage_service, mock_s3_client):
        """Test that upload handles S3 errors gracefully"""
        mock_s3_client.put_object.side_effect = Exception("S3 upload failed")

        with pytest.raises(R2StorageError, match="Failed to upload image to R2"):
            storage_service.upload_image("OP01-001", b"data")

    def test_delete_image(self, storage_service, mock_s3_client):
        """Test deleting image from R2"""
        card_id = "OP01-001"

        storage_service.delete_image(card_id)

        # Verify S3 client was called correctly
        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=f"cards/{card_id}.jpg"
        )

    def test_delete_image_handles_s3_error(self, storage_service, mock_s3_client):
        """Test that delete handles S3 errors gracefully"""
        mock_s3_client.delete_object.side_effect = Exception("S3 delete failed")

        with pytest.raises(R2StorageError, match="Failed to delete image from R2"):
            storage_service.delete_image("OP01-001")

    def test_get_image_url(self, storage_service):
        """Test generating public URL for image"""
        card_id = "OP01-001"

        url = storage_service.get_image_url(card_id)

        assert url == "https://test.r2.dev/cards/OP01-001.jpg"

    def test_image_exists_returns_true(self, storage_service, mock_s3_client):
        """Test checking if image exists (exists)"""
        mock_s3_client.head_object.return_value = {"ContentLength": 12345}

        result = storage_service.image_exists("OP01-001")

        assert result is True
        mock_s3_client.head_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="cards/OP01-001.jpg"
        )

    def test_image_exists_returns_false(self, storage_service, mock_s3_client):
        """Test checking if image exists (not exists)"""
        from botocore.exceptions import ClientError
        mock_s3_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404"}}, "HeadObject"
        )

        result = storage_service.image_exists("OP01-001")

        assert result is False

    def test_bulk_upload_images(self, storage_service, mock_s3_client):
        """Test uploading multiple images in bulk"""
        images = [
            ("OP01-001", b"data1"),
            ("OP01-002", b"data2"),
            ("OP01-003", b"data3"),
        ]

        results = storage_service.bulk_upload_images(images)

        # Verify all uploads were called
        assert mock_s3_client.put_object.call_count == 3

        # Verify all results returned
        assert len(results) == 3
        assert results["OP01-001"] == "https://test.r2.dev/cards/OP01-001.jpg"
        assert results["OP01-002"] == "https://test.r2.dev/cards/OP01-002.jpg"
        assert results["OP01-003"] == "https://test.r2.dev/cards/OP01-003.jpg"

    def test_bulk_upload_continues_on_error(self, storage_service, mock_s3_client):
        """Test that bulk upload continues even if one upload fails"""
        # First upload succeeds, second fails, third succeeds
        mock_s3_client.put_object.side_effect = [
            None,  # Success
            Exception("Upload failed"),  # Failure
            None,  # Success
        ]

        images = [
            ("OP01-001", b"data1"),
            ("OP01-002", b"data2"),
            ("OP01-003", b"data3"),
        ]

        results = storage_service.bulk_upload_images(images)

        # Verify results
        assert len(results) == 2  # Only successful uploads
        assert "OP01-001" in results
        assert "OP01-002" not in results  # Failed upload
        assert "OP01-003" in results
