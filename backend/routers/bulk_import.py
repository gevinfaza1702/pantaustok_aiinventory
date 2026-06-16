"""
Bulk Import endpoint for stock movements.
Accepts a CSV file and processes each row.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import csv
import io

from database import get_db
from models.schemas import StockMovementCreate
from services.stock_service import StockService
from services.audit_service import log_action

router = APIRouter(prefix="/movements/bulk", tags=["Bulk Import"])


@router.post("", response_model=Dict[str, Any])
async def bulk_import_movements(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Import stock movements from a CSV file.
    Required columns: product_id, movement_type, quantity
    Optional: reference, notes, unit_cost
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handles BOM
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    required_cols = {"product_id", "movement_type", "quantity"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {required_cols}. Found: {reader.fieldnames}",
        )

    success, errors = 0, []

    for i, row in enumerate(reader, start=2):  # start=2 to account for header row
        try:
            movement = StockMovementCreate(
                product_id=row["product_id"].strip(),
                movement_type=row["movement_type"].strip().lower(),
                quantity=int(row["quantity"].strip()),
                reference=row.get("reference", "bulk_import").strip() or "bulk_import",
                notes=row.get("notes", "").strip(),
                unit_cost=float(row["unit_cost"]) if row.get("unit_cost", "").strip() else None,
                created_by="Bulk Import",
            )
            await StockService.record_movement(db, movement)
            success += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    await log_action(
        db,
        entity_type="movement",
        action="import",
        description=f"Bulk imported {success} movements from {file.filename}. Errors: {len(errors)}",
        actor="Admin User",
    )

    return {
        "filename": file.filename,
        "total_rows": success + len(errors),
        "success": success,
        "errors": errors,
    }
