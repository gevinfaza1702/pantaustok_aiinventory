import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL query debugging
    future=True,
    pool_size=20,
    max_overflow=10
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Declarative base for ORM models
Base = declarative_base()

# Dependency to get DB session
async def get_db():
    """ Dependency for getting an async database session """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
