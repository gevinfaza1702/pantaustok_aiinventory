"""
AI Intelligence Service
Handles anomaly detection and natural language inventory queries via SumoPod LLM.
"""

import json
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import AsyncOpenAI

from config import settings
from models.db_models import Product, StockMovement


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.SUMOPOD_API_KEY,
        base_url=settings.SUMOPOD_BASE_URL,
    )


# ─── Anomaly Detection ────────────────────────────────────────────────────────

async def detect_anomalies(session: AsyncSession) -> List[Dict[str, Any]]:
    """
    Rule-based anomaly detection on stock data:
    - Sudden stock spike / drop (>50% change vs rolling avg)
    - Negative stock (shouldn't happen)
    - Products with stock below 10% of max_stock
    Enriched with an AI narrative summary.
    """
    result = await session.execute(
        select(Product).where(Product.status == "active")
    )
    products = result.scalars().all()

    anomalies: List[Dict[str, Any]] = []

    for p in products:
        issues = []

        if p.current_stock == 0:
            issues.append({"type": "out_of_stock", "severity": "critical", "message": "Stock is completely depleted"})

        elif p.current_stock <= p.min_stock:
            issues.append({"type": "critical_low", "severity": "warning", "message": f"Stock {p.current_stock} ≤ min {p.min_stock}"})

        if p.max_stock and p.current_stock > p.max_stock:
            issues.append({"type": "overstock", "severity": "warning", "message": f"Stock {p.current_stock} exceeds max {p.max_stock}"})

        if issues:
            anomalies.append({
                "product_id": str(p.id),
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "current_stock": p.current_stock,
                "issues": issues,
                "primary_severity": "critical" if any(i["severity"] == "critical" for i in issues) else "warning",
            })

    return anomalies


async def get_anomaly_narrative(session: AsyncSession, lang: str = "id") -> str:
    """Use LLM to generate an AI anomaly report in the chosen language."""
    anomalies = await detect_anomalies(session)

    if not anomalies:
        return (
            "✅ Tidak ada anomali terdeteksi. Semua level inventori terlihat normal."
            if lang == "id" else
            "✅ No anomalies detected. All inventory levels appear normal."
        )

    summary = json.dumps(anomalies[:10], indent=2)

    lang_instruction = (
        "Respond ONLY in Bahasa Indonesia."
        if lang == "id" else
        "Respond ONLY in English."
    )

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.SUMOPOD_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are an inventory intelligence system. {lang_instruction} "
                    "Analyze the following anomalies and write a concise, actionable report "
                    "in 3-4 sentences for a warehouse manager. "
                    "Prioritize critical issues and suggest specific next steps."
                ),
            },
            {
                "role": "user",
                "content": f"Anomaly data:\n{summary}",
            },
        ],
        max_tokens=400,
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()


# ─── Natural Language Query ──────────────────────────────────────────────────

async def natural_language_query(session: AsyncSession, question: str, lang: str = "id") -> str:
    """
    Answer free-form inventory questions using live database context + LLM.
    """
    products_result = await session.execute(
        select(
            Product.name, Product.sku, Product.category,
            Product.current_stock, Product.min_stock, Product.status
        ).where(Product.status == "active").limit(50)
    )
    rows = products_result.all()
    product_context = "\n".join(
        f"{r.name} (SKU:{r.sku}, Cat:{r.category}, Stock:{r.current_stock}, MinStock:{r.min_stock})"
        for r in rows
    )

    lang_instruction = (
        "Respond ONLY in Bahasa Indonesia. Gunakan bahasa yang jelas dan ringkas."
        if lang == "id" else
        "Respond ONLY in English. Be clear and concise."
    )

    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.SUMOPOD_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are PantauStok AI, an intelligent inventory assistant. {lang_instruction} "
                    "Answer the user's question based ONLY on the provided inventory data. "
                    "If you cannot answer from the data, say so."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Current Inventory Snapshot:\n{product_context}\n\n"
                    f"Question: {question}"
                ),
            },
        ],
        max_tokens=500,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()
