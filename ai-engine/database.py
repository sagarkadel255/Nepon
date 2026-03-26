"""
NEPON AI Engine — Database Connection

Provides an async MongoDB connection via Motor for the FastAPI service,
and a synchronous PyMongo client for model training jobs.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from pymongo.database import Database as SyncDatabase
from config import settings

# Async client (used by the FastAPI request handlers)
_async_client: AsyncIOMotorClient | None = None
_async_db: AsyncIOMotorDatabase | None = None


async def get_async_db() -> AsyncIOMotorDatabase:
    """Return (and lazily create) the async Motor database handle."""
    global _async_client, _async_db
    if _async_db is None:
        _async_client = AsyncIOMotorClient(settings.mongodb_uri)
        # Extract the database name from the URI, fall back to "nepon"
        db_name = settings.mongodb_uri.rsplit("/", 1)[-1].split("?")[0] or "nepon"
        _async_db = _async_client[db_name]
    return _async_db


async def close_async_db() -> None:
    """Close the async MongoDB connection."""
    global _async_client, _async_db
    if _async_client:
        _async_client.close()
        _async_client = None
        _async_db = None


# Sync client (used by the offline training pipeline)
def get_sync_db() -> SyncDatabase:
    """Return a synchronous PyMongo database handle for batch jobs."""
    client = MongoClient(settings.mongodb_uri)
    db_name = settings.mongodb_uri.rsplit("/", 1)[-1].split("?")[0] or "nepon"
    return client[db_name]
