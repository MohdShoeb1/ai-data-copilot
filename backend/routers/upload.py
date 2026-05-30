"""
POST /api/v1/upload
"""
import uuid, io, math
import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def clean_for_json(obj):
    """Recursively replace NaN/Inf with None so JSON serialization never fails."""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_for_json(i) for i in obj]
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if pd.isna(obj) if not isinstance(obj, (list, dict, np.ndarray)) else False:
        return None
    return obj


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    fname = file.filename or "upload"
    df = None

    try:
        if fname.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif fname.endswith(".json"):
            df = pd.read_json(io.BytesIO(content))
        else:
            for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"):
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=encoding, low_memory=False)
                    break
                except (UnicodeDecodeError, Exception):
                    continue
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if df is None or df.empty:
        raise HTTPException(status_code=422, detail="File is empty or could not be parsed")

    # Column info
    column_info = []
    for col in df.columns:
        column_info.append({
            "name": str(col),
            "type": str(df[col].dtype),
            "missing": int(df[col].isna().sum()),
            "missing_pct": round(float(df[col].isna().mean() * 100), 1),
        })

    # Preview — replace all NaN with None
    preview_df = df.head(5).copy()
    preview = []
    for _, row in preview_df.iterrows():
        clean_row = {}
        for col in preview_df.columns:
            val = row[col]
            try:
                if pd.isna(val):
                    clean_row[str(col)] = None
                    continue
            except (TypeError, ValueError):
                pass
            if isinstance(val, (np.integer,)):
                clean_row[str(col)] = int(val)
            elif isinstance(val, (np.floating,)):
                v = float(val)
                clean_row[str(col)] = None if (math.isnan(v) or math.isinf(v)) else v
            elif isinstance(val, (np.bool_,)):
                clean_row[str(col)] = bool(val)
            else:
                clean_row[str(col)] = str(val) if not isinstance(val, (str, int, float, bool, type(None))) else val
        preview.append(clean_row)

    from services import session_store
    session_id = str(uuid.uuid4())[:8]
    session_store.create_session(session_id, fname, df)

    result = {
        "session_id": session_id,
        "filename": fname,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_info": column_info,
        "preview": preview,
    }

    return JSONResponse(content=clean_for_json(result))
