"""
Agent 1: Data Cleaning Agent
Cleans raw DataFrames and returns structured CleaningResult.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import pandas as pd
import numpy as np


@dataclass
class CleaningStep:
    action: str
    detail: str
    rows_affected: int


@dataclass
class CleaningResult:
    cleaned_df: pd.DataFrame
    steps: List[CleaningStep]
    quality_score: int          # 0-100
    original_shape: tuple
    cleaned_shape: tuple
    column_types: Dict[str, str]


class DataCleaningAgent:

    def run(self, df: pd.DataFrame) -> CleaningResult:
        steps: List[CleaningStep] = []
        original_shape = df.shape
        df = df.copy()

        # ── 1. Standardise column names ───────────────────────────────────
        old_cols = df.columns.tolist()
        df.columns = (
            df.columns
            .str.strip()
            .str.lower()
            .str.replace(r"[\s\-]+", "_", regex=True)
            .str.replace(r"[^\w]", "", regex=True)
        )
        renamed = [(o, n) for o, n in zip(old_cols, df.columns) if o != n]
        if renamed:
            steps.append(CleaningStep(
                "Rename columns",
                f"Standardised to snake_case: {renamed[:5]}",
                0,
            ))

        # ── 2. Drop fully empty columns ───────────────────────────────────
        empty_cols = df.columns[df.isna().all()].tolist()
        if empty_cols:
            df.drop(columns=empty_cols, inplace=True)
            steps.append(CleaningStep("Drop empty columns", str(empty_cols), 0))

        # ── 3. Remove duplicate rows ──────────────────────────────────────
        n_dupes = df.duplicated().sum()
        if n_dupes:
            df.drop_duplicates(inplace=True)
            df.reset_index(drop=True, inplace=True)
            steps.append(CleaningStep("Remove duplicates", f"Dropped {n_dupes} duplicate rows", int(n_dupes)))

        # ── 4. Infer & fix data types ─────────────────────────────────────
        for col in df.columns:
            # Try numeric
            if df[col].dtype == object:
                converted = pd.to_numeric(df[col].str.replace(",", "").str.strip(), errors="coerce")
                if converted.notna().mean() > 0.7:
                    df[col] = converted
                    steps.append(CleaningStep("Type inference", f"`{col}` → numeric", 0))
                    continue
            # Try datetime
            if df[col].dtype == object:
                try:
                    df[col] = pd.to_datetime(df[col], infer_format=True, errors="coerce")
                    if df[col].notna().mean() > 0.7:
                        steps.append(CleaningStep("Type inference", f"`{col}` → datetime", 0))
                    else:
                        df[col] = df[col].astype(str)
                except Exception:
                    pass

        # ── 5. Handle missing values ──────────────────────────────────────
        total_missing = int(df.isna().sum().sum())
        if total_missing:
            for col in df.columns:
                n_miss = int(df[col].isna().sum())
                if n_miss == 0:
                    continue
                pct = n_miss / len(df)
                if pct > 0.5:
                    # Too many missing — drop column
                    df.drop(columns=[col], inplace=True)
                    steps.append(CleaningStep("Drop column", f"`{col}` had {pct:.0%} missing", n_miss))
                elif pd.api.types.is_numeric_dtype(df[col]):
                    median_val = df[col].median()
                    df[col] = df[col].fillna(median_val)
                    steps.append(CleaningStep("Fill missing", f"`{col}` filled with median ({median_val:.2f})", n_miss))
                else:
                    mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else "Unknown"
                    df[col] = df[col].fillna(mode_val)
                    steps.append(CleaningStep("Fill missing", f"`{col}` filled with mode", n_miss))

        # ── 6. Outlier detection (IQR) — flag, don't remove ──────────────
        outlier_cols = []
        for col in df.select_dtypes(include=[np.number]).columns:
            Q1, Q3 = df[col].quantile([0.25, 0.75])
            IQR = Q3 - Q1
            mask = (df[col] < Q1 - 3 * IQR) | (df[col] > Q3 + 3 * IQR)
            n_out = int(mask.sum())
            if n_out:
                outlier_cols.append(f"{col}({n_out})")
        if outlier_cols:
            steps.append(CleaningStep("Flag outliers", f"IQR outliers in: {', '.join(outlier_cols[:6])}", 0))

        # ── 7. Compute quality score ──────────────────────────────────────
        missing_pct = df.isna().mean().mean()
        dupe_pct = n_dupes / max(original_shape[0], 1)
        quality_score = max(0, min(100, int(100 - (missing_pct * 50) - (dupe_pct * 30))))

        column_types = {col: str(df[col].dtype) for col in df.columns}

        return CleaningResult(
            cleaned_df=df,
            steps=steps,
            quality_score=quality_score,
            original_shape=original_shape,
            cleaned_shape=df.shape,
            column_types=column_types,
        )
