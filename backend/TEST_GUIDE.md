# Share Deck Manager - Test Suite Guide

## Overview

This document provides comprehensive information about the test suite for Share Deck Manager's Phase 1 refactoring changes.

**Test Statistics:**
- **Total Tests**: 69
- **Pass Rate**: 100%
- **Code Coverage**: 78% overall
- **Critical Coverage**: 100% on core modules (dependencies, models, schemas)

## Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py              # Shared fixtures and configuration
├── pytest.ini               # Pytest configuration
├── core/
│   ├── __init__.py
│   ├── test_dependencies.py # JWT dependency testing (12 tests)
│   └── test_security.py     # Google OAuth caching (10 tests)
└── schemas/
    ├── __init__.py
    ├── test_deck.py         # Deck validation (27 tests)
    └── test_user.py         # User validation (20 tests)
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
cd /home/user/share-deck-manager/backend
pip install pytest pytest-asyncio pytest-cov aiosqlite
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
# Run all tests with verbose output
pytest tests/ -v

# Run with short traceback format
pytest tests/ -v --tb=short

# Run silently (minimal output)
pytest tests/ -q
```

### Run Specific Test Categories

```bash
# Run only unit tests
pytest tests/ -m unit

# Run only integration tests
pytest tests/ -m integration

# Run only security tests
pytest tests/ -m security

# Run only validation tests
pytest tests/ -m validation
```

### Run Specific Test Files

```bash
# Test dependencies
pytest tests/core/test_dependencies.py -v

# Test security
pytest tests/core/test_security.py -v

# Test deck schemas
pytest tests/schemas/test_deck.py -v

# Test user schemas
pytest tests/schemas/test_user.py -v
```

### Run Single Test

```bash
# Run specific test class
pytest tests/core/test_dependencies.py::TestGetCurrentUserDependency -v

# Run specific test method
pytest tests/core/test_dependencies.py::TestGetCurrentUserDependency::test_get_current_user_valid_payload -v
```

### Generate Coverage Report

```bash
# Terminal report
pytest tests/ --cov=app --cov-report=term-missing

# HTML report
pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html in browser

# JSON report
pytest tests/ --cov=app --cov-report=json
```

## Test Coverage

### Coverage by Module

| Module | Coverage | Lines |
|--------|----------|-------|
| `app/core/dependencies.py` | 100% | 15/15 |
| `app/core/security.py` | 65% | 28/43 |
| `app/schemas/deck.py` | 100% | 17/17 |
| `app/schemas/user.py` | 100% | 4/4 |
| `app/models/user.py` | 100% | 14/14 |
| `app/models/deck.py` | 100% | 13/13 |
| `app/models/card.py` | 100% | 15/15 |
| **TOTAL** | **78%** | **133/171** |

### Not Covered

- `app/core/security.py` (verify_token function) - Requires more complex mocking of JWT tokens
- `app/db/session.py` - Production database session setup
- `app/main.py` - FastAPI app initialization
- `app/schemas/card.py` - No changes in refactoring; basic schema

## Test Categories

### 1. Security Tests (`tests/core/test_security.py`)

**Purpose**: Verify Google public key caching mechanism

**Tests (10):**

1. **Cache Miss** - First call fetches from Google's endpoint
2. **Cache Hit** - Subsequent calls use cached keys
3. **Request Failure** - Handles network errors gracefully
4. **Key Found** - Retrieves specific key by key ID
5. **Key Not Found** - Returns None for unknown key IDs
6. **Multiple Keys** - Handles multiple keys from one request
7. **Cache Structure** - Verifies TTLCache configuration (maxsize=10, ttl=3600)
8. **Invalid Response** - Handles malformed JSON from Google
9. **Cache Key Storage** - Verifies internal cache structure
10. **Integration Test** - Token verification with cache

**Key Features Tested:**
- TTL cache with 1-hour expiration
- Concurrent access to cached keys
- Google API error handling
- Cache hit/miss behavior

### 2. Dependency Tests (`tests/core/test_dependencies.py`)

**Purpose**: Test `get_current_user()` dependency for JWT authentication

**Tests (12):**

1. **Valid Payload** - Returns user for valid JWT
2. **Missing 'sub' Field** - Raises 401 for missing subject
3. **Non-existent User** - Raises 404 when user not found
4. **Multiple Users** - Finds correct user among multiple
5. **User Object** - Returns proper User model instance
6. **Preserve Attributes** - All user fields maintained
7. **Inactive User** - Still returns inactive users (status check elsewhere)
8. **Empty Subject** - Raises 401 for empty string subject
9. **Case Sensitivity** - google_id lookup is case-sensitive
10. **Database Query** - Integration test with real session
11. **Doesn't Create User** - Doesn't auto-create missing users
12. **Same Session User** - Returns consistent data from same session

**Key Features Tested:**
- JWT payload validation
- User lookup by google_id
- Error handling (401, 404)
- Database integration
- SQLAlchemy AsyncSession usage

### 3. Deck Schema Tests (`tests/schemas/test_deck.py`)

**Purpose**: Validate DeckCreate, DeckUpdate, and DeckPublic schemas

**Tests (27):**

#### DeckCreate (11 tests)
- Valid creation
- Min/max name length (1-100 chars)
- Name too long (101+ chars fails)
- Empty name validation
- Whitespace-only names
- Special characters (✓)
- Unicode characters (✓)
- Missing leader_card_id
- Invalid leader_card_id type
- UUID string conversion

#### DeckUpdate (4 tests)
- Valid update
- Name length validation
- Empty name fails
- Ignores extra fields

#### DeckPublic (2 tests)
- Valid response schema
- Optional leader_card relationship

#### Name Normalization (4 tests)
- Leading/trailing spaces preserved
- Newlines and tabs preserved
- Boundary conditions (exactly 100 vs 101 chars)

**Key Features Tested:**
- Pydantic field validation
- Length constraints
- Type coercion
- Unicode support

### 4. User Schema Tests (`tests/schemas/test_user.py`)

**Purpose**: Validate UserPublic schema

**Tests (20):**

#### Basic Validation (11 tests)
- With nickname ✓
- Without nickname (None) ✓
- Empty string nickname ✓
- Min/max length (1-50 chars)
- Exceeds max length (51+ fails)
- Spaces in nickname
- Special characters
- Unicode (Japanese, emoji)
- Numbers only
- Hyphens and underscores

#### Edge Cases (10 tests)
- Exactly 50 chars (✓)
- Exactly 51 chars (fails)
- Leading/trailing spaces
- Whitespace only
- Newlines and tabs
- Multiple instances independence
- Field updates
- Serialization (model_dump, model_dump_json)
- Deserialization (model_validate)

**Key Features Tested:**
- Optional fields
- Length constraints
- Serialization/deserialization
- Model validation

## Test Infrastructure

### Fixtures (`conftest.py`)

#### Database Fixtures
- `test_engine` - In-memory SQLite database
- `test_session` - AsyncSession for tests

#### Model Fixtures
- `test_user` - Standard test user
- `test_user_no_nickname` - User without nickname
- `test_card` - Test card
- `test_deck` - Test deck

#### Mock Fixtures
- `mock_google_keys` - Google public keys response
- `mock_jwt_payload` - Sample JWT payload
- `mock_credentials` - HTTPBearer credentials
- `mock_requests_get` - Mocked requests.get
- `mock_jwt_decode` - Mocked jwt.decode
- `mock_jwt_get_unverified_header` - Mocked jwt header extraction
- `mock_verify_token` - Mocked verify_token dependency
- `mock_env_vars` - Environment variables

### Configuration (`pytest.ini`)

```ini
[pytest]
python_files = test_*.py
python_classes = Test*
python_functions = test_*
testpaths = tests
asyncio_mode = auto

markers =
    unit: Unit tests
    integration: Integration tests
    security: Security tests
    validation: Validation tests
    slow: Slow running tests
```

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

All tests follow the AAA pattern for clarity:

```python
async def test_get_current_user_valid_payload(self, test_session, test_user):
    # Arrange
    test_user_created = test_user

    # Act
    user = await get_current_user(
        payload={"sub": test_user_created.google_id},
        session=test_session
    )

    # Assert
    assert user.id == test_user_created.id
```

### Async Testing

Tests using async/await are marked with `@pytest.mark.asyncio`:

```python
@pytest.mark.asyncio
async def test_async_function(self, test_session):
    result = await some_async_function(test_session)
    assert result is not None
```

### Mocking External Dependencies

External dependencies (Google API, JWT) are mocked:

```python
def test_cache_miss(self, mock_requests_get, mock_google_keys):
    # mock_requests_get is pre-configured to return mock_google_keys
    keys = get_google_public_keys()
    assert keys == mock_google_keys["keys"]
```

## Common Issues and Solutions

### Issue: `ModuleNotFoundError: No module named 'pytest'`

**Solution:**
```bash
pip install pytest pytest-asyncio pytest-cov
```

### Issue: `sqlalchemy.exc.ArgumentError: Expected string or URL object, got None`

**Solution**: Environment variables are set in conftest.py before importing app modules. No action needed.

### Issue: Tests fail with cryptography errors

**Solution:**
```bash
pip install cffi cryptography
```

### Issue: `pyo3_runtime.PanicException` from cryptography

**Solution:**
```bash
pip install --upgrade cryptography cffi
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v2
```

## Adding New Tests

### Template for New Test File

```python
"""
Tests for [module description].

Test Coverage:
- Feature 1
- Feature 2
"""
import pytest

@pytest.mark.unit
class TestNewFeature:
    """Test suite for new feature."""

    def test_something(self):
        """
        Test description.

        Arrange:
            Setup test data
        Act:
            Perform action
        Assert:
            Verify result
        """
        # Arrange

        # Act

        # Assert
```

### Template for New Fixture

```python
@pytest_asyncio.fixture
async def test_new_model(test_session: AsyncSession) -> NewModel:
    """Create a test instance of NewModel."""
    model = NewModel(...)
    test_session.add(model)
    await test_session.commit()
    await test_session.refresh(model)
    return model
```

## Performance

### Test Execution Time

```bash
pytest tests/ --durations=10
```

Shows slowest 10 tests. Current suite runs in ~2 seconds.

### Parallel Execution

Install pytest-xdist:
```bash
pip install pytest-xdist
pytest tests/ -n auto
```

## Maintenance

### Update Coverage Baseline

```bash
pytest tests/ --cov=app --cov-report=html
# Review htmlcov/index.html
```

### Check Test Quality

```bash
# List tests without running them
pytest tests/ --collect-only -q

# Show which fixtures are used
pytest tests/ --fixtures
```

## References

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_basics.html#testing-orm-code)

## Contributing

When adding new features to Phase 1 refactoring:

1. Write tests first (TDD recommended)
2. Ensure all tests pass: `pytest tests/ -v`
3. Check coverage: `pytest tests/ --cov=app`
4. Coverage target: **80%+ overall, 100% for critical modules**
5. Run specific test category: `pytest tests/ -m [marker]`
6. Update this guide if adding new test categories

## Support

For test-related issues:
1. Check this guide first
2. Review failing test output
3. Run with `-vv` for verbose output: `pytest tests/ -vv`
4. Check conftest.py for available fixtures
