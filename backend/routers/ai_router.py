"""AI Intelligence router: Anomaly detection + Natural Language Query."""

from typing import Dict, Any, List

from fastapi import APIRouter, Depends, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.ai_intelligence import (
    detect_anomalies,
    get_anomaly_narrative,
    natural_language_query,
)

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])


@router.get("/anomalies", response_model=List[Dict[str, Any]])
async def get_anomalies(db: AsyncSession = Depends(get_db)):
    """Rule-based anomaly detection across all products."""
    return await detect_anomalies(db)


@router.get("/anomalies/narrative", response_model=Dict[str, str])
async def get_anomaly_narrative_report(
    lang: str = Query("id", regex="^(id|en)$"),
    db: AsyncSession = Depends(get_db),
):
    """AI-generated narrative summary of current inventory anomalies."""
    narrative = await get_anomaly_narrative(db, lang=lang)
    return {"narrative": narrative}


@router.post("/query", response_model=Dict[str, str])
async def query_inventory(
    question: str = Body(..., embed=True),
    lang: str = Body("id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a natural language question about the inventory.
    Example: "Produk mana yang akan habis minggu ini?"
    """
    answer = await natural_language_query(db, question, lang=lang)
    return {"question": question, "answer": answer}
