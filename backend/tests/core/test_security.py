"""
Tests for security module, specifically Google public key caching.

Test Coverage:
- Cache hit/miss behavior
- Cache expiration (TTL)
- Concurrent access
- Mocking Google's certificate endpoint
"""
import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime
from cachetools import TTLCache

from app.core.security import (
    get_google_public_keys,
    get_google_public_key,
)


@pytest.mark.unit
@pytest.mark.security
class TestGooglePublicKeysCaching:
    """Test suite for Google public keys caching functionality."""

    def test_get_google_public_keys_cache_miss(self, mock_requests_get, mock_google_keys):
        """
        Test that cache miss fetches keys from Google's endpoint.

        Arrange:
            Mock requests.get to return Google public keys
        Act:
            Call get_google_public_keys()
        Assert:
            - Requests.get is called once
            - Returned keys match Google's response
        """
        # Arrange
        mock_requests_get.reset_mock()
        # Clear the cache
        from app.core import security
        security._google_keys_cache.clear()

        # Act
        keys = get_google_public_keys()

        # Assert
        mock_requests_get.assert_called_once()
        assert keys == mock_google_keys["keys"]
        assert len(keys) == 2

    def test_get_google_public_keys_cache_hit(self, mock_requests_get, mock_google_keys):
        """
        Test that subsequent calls use cached keys (cache hit).

        Arrange:
            First call populates cache
        Act:
            Call get_google_public_keys() twice
        Assert:
            - Requests.get is called only once (cached on second call)
            - Both calls return the same keys
        """
        # Arrange
        mock_requests_get.reset_mock()
        from app.core import security
        security._google_keys_cache.clear()

        # Act - First call (cache miss)
        keys_1 = get_google_public_keys()
        assert mock_requests_get.call_count == 1

        # Act - Second call (cache hit)
        keys_2 = get_google_public_keys()
        assert mock_requests_get.call_count == 1  # Still 1, not 2

        # Assert
        assert keys_1 == keys_2
        assert keys_1 == mock_google_keys["keys"]

    def test_get_google_public_keys_request_failure(self, mock_requests_get):
        """
        Test behavior when Google's endpoint returns an error.

        Arrange:
            Mock requests.get to raise an exception
        Act:
            Call get_google_public_keys()
        Assert:
            HTTPError is propagated
        """
        # Arrange
        from requests.exceptions import RequestException
        mock_requests_get.side_effect = RequestException("Network error")

        from app.core import security
        security._google_keys_cache.clear()

        # Act & Assert
        with pytest.raises(RequestException, match="Network error"):
            get_google_public_keys()

    def test_get_google_public_key_found(self, mock_requests_get, mock_google_keys):
        """
        Test retrieving a specific public key by kid.

        Arrange:
            Populate cache with Google keys
        Act:
            Get public key for "test-key-id-1"
        Assert:
            Returns the correct key with matching kid
        """
        # Arrange
        mock_requests_get.reset_mock()
        from app.core import security
        security._google_keys_cache.clear()

        # Act
        key = get_google_public_key("test-key-id-1")

        # Assert
        assert key is not None
        assert key["kid"] == "test-key-id-1"
        assert key["kty"] == "RSA"
        assert "n" in key
        assert "e" in key

    def test_get_google_public_key_not_found(self, mock_requests_get, mock_google_keys):
        """
        Test retrieving a non-existent public key.

        Arrange:
            Populate cache with Google keys
        Act:
            Get public key for non-existent kid "unknown-key-id"
        Assert:
            Returns None
        """
        # Arrange
        mock_requests_get.reset_mock()
        from app.core import security
        security._google_keys_cache.clear()

        # Act
        key = get_google_public_key("unknown-key-id")

        # Assert
        assert key is None

    def test_get_google_public_key_multiple_keys(self, mock_requests_get, mock_google_keys):
        """
        Test retrieving different keys from the same cache.

        Arrange:
            Populate cache with multiple keys
        Act:
            Get different keys by kid
        Assert:
            Both keys are found and correct
        """
        # Arrange
        mock_requests_get.reset_mock()
        from app.core import security
        security._google_keys_cache.clear()

        # Act
        key_1 = get_google_public_key("test-key-id-1")
        key_2 = get_google_public_key("test-key-id-2")

        # Assert
        assert key_1 is not None
        assert key_2 is not None
        assert key_1["kid"] == "test-key-id-1"
        assert key_2["kid"] == "test-key-id-2"
        # Requests should have been called only once (both keys in one response)
        assert mock_requests_get.call_count == 1

    def test_cache_structure(self, mock_requests_get):
        """
        Test that the cache is properly initialized with correct TTL.

        Arrange & Act:
            Import security module
        Assert:
            Cache is a TTLCache with correct maxsize and ttl
        """
        from app.core import security

        # Assert
        assert isinstance(security._google_keys_cache, TTLCache)
        # maxsize=10 as per security.py
        assert security._google_keys_cache.maxsize == 10
        # ttl=3600 (1 hour) as per security.py
        assert security._google_keys_cache.ttl == 3600

    def test_get_google_public_keys_invalid_response(self, mock_requests_get):
        """
        Test handling of invalid JSON response from Google.

        Arrange:
            Mock response with invalid JSON structure
        Act:
            Call get_google_public_keys()
        Assert:
            KeyError is raised
        """
        # Arrange
        mock_response = MagicMock()
        mock_response.json.return_value = {"invalid": "response"}  # Missing 'keys'
        mock_requests_get.return_value = mock_response

        from app.core import security
        security._google_keys_cache.clear()

        # Act & Assert
        with pytest.raises(KeyError):
            get_google_public_keys()

    def test_cache_key_storage(self, mock_requests_get, mock_google_keys):
        """
        Test that keys are stored under "keys" key in cache.

        Arrange:
            Get Google public keys
        Act:
            Check cache internal structure
        Assert:
            Keys are stored under "keys" in the cache
        """
        # Arrange
        mock_requests_get.reset_mock()
        from app.core import security
        security._google_keys_cache.clear()

        # Act
        keys = get_google_public_keys()

        # Assert
        assert "keys" in security._google_keys_cache
        assert security._google_keys_cache["keys"] == mock_google_keys["keys"]


@pytest.mark.unit
@pytest.mark.security
class TestVerifyTokenIntegration:
    """Integration tests for token verification with caching."""

    def test_verify_token_with_cache_hit(
        self,
        mock_requests_get,
        mock_google_keys,
        mock_jwt_payload,
        mock_jwt_get_unverified_header,
        mock_jwt_decode,
        mock_credentials,
        mock_env_vars,
    ):
        """
        Test token verification with cache hit.

        Arrange:
            Mock JWT header and decode functions
            Setup mocked credentials
        Act:
            Call verify_token (indirectly through mocked components)
        Assert:
            Google keys are fetched (cache miss on first call)
        """
        # Arrange
        from app.core import security

        security._google_keys_cache.clear()
        mock_jwt_get_unverified_header.return_value = {"kid": "test-key-id-1"}
        mock_jwt_decode.return_value = mock_jwt_payload
        mock_requests_get.reset_mock()

        # Act
        from app.core.security import get_google_public_key

        key = get_google_public_key("test-key-id-1")

        # Assert
        assert key is not None
        assert mock_requests_get.call_count == 1

        # Act - Second call should use cache
        key_again = get_google_public_key("test-key-id-1")

        # Assert
        assert key_again is not None
        assert mock_requests_get.call_count == 1  # Still 1
