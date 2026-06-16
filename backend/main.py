from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings

# Core routers
from routers import products, suppliers, stock_movements, forecasting, analytics, alerts

# New feature routers
from routers import reorder, intelligence, ai_router, export_router, audit_router, bulk_import

# Ensure extended models are registered with SQLAlchemy metadata
import models.extended_models  # noqa: F401

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_STR}/openapi.json",
    docs_url=f"{settings.API_STR}/docs",
)

# CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ─── Core Routes ─────────────────────────────────────────
app.include_router(products.router,        prefix=settings.API_STR)
app.include_router(suppliers.router,       prefix=settings.API_STR)
app.include_router(stock_movements.router, prefix=settings.API_STR)
app.include_router(forecasting.router,     prefix=settings.API_STR)
app.include_router(analytics.router,       prefix=settings.API_STR)
app.include_router(alerts.router,          prefix=settings.API_STR)

# ─── New Feature Routes ──────────────────────────────────
app.include_router(reorder.router,         prefix=settings.API_STR)
app.include_router(intelligence.router,    prefix=settings.API_STR)
app.include_router(ai_router.router,       prefix=settings.API_STR)
app.include_router(export_router.router,   prefix=settings.API_STR)
app.include_router(audit_router.router,    prefix=settings.API_STR)
app.include_router(bulk_import.router,     prefix=settings.API_STR)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get(f"{settings.API_STR}/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.post(f"{settings.API_STR}/seed")
async def seed_database():
    from seed_data import seed_data
    try:
        await seed_data()
        return {"message": "Database seeded successfully"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
