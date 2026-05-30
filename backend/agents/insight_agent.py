"""
Agent 2: Insight Discovery Agent
Statistical analysis + LLM narrative via Groq.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import json

from services.groq_client import call_groq


@dataclass
class InsightResult:
    stats: Dict[str, Any]
    correlations: Dict[str, float]
    top_n: Dict[str, Any]
    anomalies: List[Dict[str, Any]]
    trends: List[str]
    narrative: List[Dict[str, str]]   # [{label, text, evidence, action}]
    column_info: List[Dict[str, Any]]


class InsightAgent:

    def run(self, df: pd.DataFrame, filename: str = "dataset") -> InsightResult:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        date_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

        # ── Basic stats ───────────────────────────────────────────────────
        stats: Dict[str, Any] = {
            "rows": len(df),
            "columns": len(df.columns),
            "numeric_columns": len(numeric_cols),
            "categorical_columns": len(cat_cols),
            "date_columns": len(date_cols),
        }
        if numeric_cols:
            desc = df[numeric_cols].describe().to_dict()
            stats["numeric_summary"] = {
                col: {k: round(v, 4) for k, v in vals.items()}
                for col, vals in desc.items()
            }

        # ── Correlations ──────────────────────────────────────────────────
        correlations: Dict[str, float] = {}
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            for i, c1 in enumerate(numeric_cols):
                for c2 in numeric_cols[i + 1:]:
                    val = corr_matrix.loc[c1, c2]
                    if not np.isnan(val):
                        correlations[f"{c1}_vs_{c2}"] = round(float(val), 3)
            # Sort by abs value
            correlations = dict(sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True))

        # ── Top/Bottom N per numeric col ──────────────────────────────────
        top_n: Dict[str, Any] = {}
        for col in numeric_cols[:3]:
            top_n[col] = {
                "max": {"value": round(float(df[col].max()), 2), "idx": int(df[col].idxmax())},
                "min": {"value": round(float(df[col].min()), 2), "idx": int(df[col].idxmin())},
            }

        # ── Anomalies (IQR 3×) ────────────────────────────────────────────
        anomalies: List[Dict[str, Any]] = []
        for col in numeric_cols:
            Q1, Q3 = df[col].quantile([0.25, 0.75])
            IQR = Q3 - Q1
            mask = (df[col] < Q1 - 3 * IQR) | (df[col] > Q3 + 3 * IQR)
            for idx in df[mask].index[:3]:
                anomalies.append({
                    "row": int(idx),
                    "column": col,
                    "value": round(float(df.loc[idx, col]), 2),
                    "expected_range": f"{Q1 - 3*IQR:.2f} – {Q3 + 3*IQR:.2f}",
                })

        # ── Trend detection ───────────────────────────────────────────────
        trends: List[str] = []
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            val_col = numeric_cols[0]
            try:
                ts = df.set_index(date_col)[val_col].resample("ME").sum()
                if len(ts) >= 3:
                    first_half = ts.iloc[: len(ts) // 2].mean()
                    second_half = ts.iloc[len(ts) // 2 :].mean()
                    pct = ((second_half - first_half) / max(abs(first_half), 1)) * 100
                    direction = "increased" if pct > 0 else "decreased"
                    trends.append(f"{val_col} {direction} {abs(pct):.1f}% from H1 to H2")
            except Exception:
                pass

        # ── Column info ───────────────────────────────────────────────────
        column_info = []
        for col in df.columns:
            info: Dict[str, Any] = {
                "name": col,
                "type": str(df[col].dtype),
                "missing": int(df[col].isna().sum()),
                "unique": int(df[col].nunique()),
            }
            if pd.api.types.is_numeric_dtype(df[col]):
                info["mean"] = round(float(df[col].mean()), 2)
                info["std"] = round(float(df[col].std()), 2)
            column_info.append(info)

        # ── LLM narrative via Groq ────────────────────────────────────────
        narrative = self._generate_narrative(df, stats, correlations, anomalies, filename)

        return InsightResult(
            stats=stats,
            correlations=correlations,
            top_n=top_n,
            anomalies=anomalies,
            trends=trends,
            narrative=narrative,
            column_info=column_info,
        )

    def _generate_narrative(self, df, stats, correlations, anomalies, filename) -> List[Dict[str, str]]:
        prompt = f"""You are a senior data analyst. Analyze this dataset and return EXACTLY 4 insights as a JSON array.
Each insight must have keys: "label" (one of: Insight/Trend/Anomaly/Correlation), "text" (1 sentence finding with specific numbers), "evidence" (specific data reference), "action" (recommended next step).

Dataset: {filename}
Shape: {stats['rows']} rows × {stats['columns']} columns
Numeric columns: {stats.get('numeric_columns', 0)}
Categorical columns: {stats.get('categorical_columns', 0)}

Top correlations: {json.dumps(dict(list(correlations.items())[:5]), indent=2)}
Anomalies found: {len(anomalies)}
Sample anomaly: {json.dumps(anomalies[0]) if anomalies else 'none'}

Numeric summary (first 2 cols):
{df.select_dtypes(include='number').describe().iloc[:, :2].to_string()}

Return ONLY a valid JSON array. No markdown, no explanation."""

        raw = call_groq(prompt)
        if not raw:
            return self._fallback_narrative(stats, correlations, anomalies)
        try:
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            return json.loads(raw)
        except Exception:
            return self._fallback_narrative(stats, correlations, anomalies)

    def _fallback_narrative(self, stats, correlations, anomalies):
        insights = [{
            "label": "Insight",
            "text": f"Dataset contains {stats['rows']} rows across {stats['columns']} columns.",
            "evidence": f"{stats.get('numeric_columns', 0)} numeric, {stats.get('categorical_columns', 0)} categorical columns",
            "action": "Review column distributions before deeper analysis",
        }]
        if correlations:
            top_k, top_v = list(correlations.items())[0]
            insights.append({
                "label": "Correlation",
                "text": f"Strongest correlation: {top_k.replace('_vs_', ' vs ')} (r={top_v})",
                "evidence": f"Pearson r = {top_v}",
                "action": "Investigate causal relationship between these variables",
            })
        if anomalies:
            a = anomalies[0]
            insights.append({
                "label": "Anomaly",
                "text": f"Row {a['row']} has an outlier in `{a['column']}`: {a['value']}",
                "evidence": f"Expected range: {a['expected_range']}",
                "action": "Verify this data point with the source system",
            })
        return insights
