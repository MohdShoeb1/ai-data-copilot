"""
Agent 3: Visualization Agent
Generates Recharts-compatible chart configs from actual DataFrame data.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import pandas as pd
import numpy as np


@dataclass
class ChartConfig:
    id: str
    type: str          # bar | line | scatter | pie | histogram
    title: str
    description: str
    data: List[Dict[str, Any]]
    x_key: str
    y_key: str
    color: str = "#3b82f6"


@dataclass
class VisualizationResult:
    charts: List[ChartConfig]


COLORS = ["#3b82f6", "#22d3ee", "#6366f1", "#10b981", "#f59e0b", "#ef4444"]


class VisualizationAgent:

    def run(self, df: pd.DataFrame, insights=None) -> VisualizationResult:
        charts: List[ChartConfig] = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        date_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

        chart_id = 0

        # ── Chart 1: Time series (if date col exists) ─────────────────────
        if date_cols and numeric_cols:
            chart_id += 1
            dc = date_cols[0]
            vc = numeric_cols[0]
            ts = (
                df.set_index(dc)[vc]
                .resample("ME")
                .sum()
                .reset_index()
            )
            ts.columns = ["month", "value"]
            ts["month"] = ts["month"].dt.strftime("%b %Y")
            records = ts.tail(12).to_dict(orient="records")
            charts.append(ChartConfig(
                id=f"chart_{chart_id:03d}",
                type="line",
                title=f"{vc.replace('_',' ').title()} Over Time",
                description=f"Monthly {vc} trend",
                data=_safe_records(records),
                x_key="month",
                y_key="value",
                color=COLORS[0],
            ))

        # ── Chart 2: Top categorical breakdown ────────────────────────────
        if cat_cols and numeric_cols:
            chart_id += 1
            cc = cat_cols[0]
            vc = numeric_cols[0]
            grp = (
                df.groupby(cc)[vc]
                .sum()
                .sort_values(ascending=False)
                .head(10)
                .reset_index()
            )
            grp.columns = ["name", "value"]
            charts.append(ChartConfig(
                id=f"chart_{chart_id:03d}",
                type="bar",
                title=f"{vc.replace('_',' ').title()} by {cc.replace('_',' ').title()}",
                description=f"Top {len(grp)} {cc} breakdown",
                data=_safe_records(grp.to_dict(orient="records")),
                x_key="name",
                y_key="value",
                color=COLORS[1],
            ))

        # ── Chart 3: Second categorical (if exists) ───────────────────────
        if len(cat_cols) > 1 and len(numeric_cols) > 1:
            chart_id += 1
            cc = cat_cols[1]
            vc = numeric_cols[1]
            grp = (
                df.groupby(cc)[vc]
                .sum()
                .sort_values(ascending=False)
                .head(8)
                .reset_index()
            )
            grp.columns = ["name", "value"]
            charts.append(ChartConfig(
                id=f"chart_{chart_id:03d}",
                type="pie",
                title=f"{vc.replace('_',' ').title()} Distribution by {cc.replace('_',' ').title()}",
                description=f"Composition breakdown",
                data=_safe_records(grp.to_dict(orient="records")),
                x_key="name",
                y_key="value",
                color=COLORS[2],
            ))

        # ── Chart 4: Scatter (top 2 numeric correlation) ──────────────────
        if len(numeric_cols) >= 2:
            chart_id += 1
            c1, c2 = numeric_cols[0], numeric_cols[1]
            sample = df[[c1, c2]].dropna().sample(min(200, len(df)), random_state=42)
            records = sample.rename(columns={c1: "x", c2: "y"}).to_dict(orient="records")
            charts.append(ChartConfig(
                id=f"chart_{chart_id:03d}",
                type="scatter",
                title=f"{c1.replace('_',' ').title()} vs {c2.replace('_',' ').title()}",
                description=f"Relationship between {c1} and {c2}",
                data=_safe_records(records),
                x_key="x",
                y_key="y",
                color=COLORS[3],
            ))

        # Fallback: histogram of first numeric col
        if not charts and numeric_cols:
            chart_id += 1
            col = numeric_cols[0]
            counts, edges = np.histogram(df[col].dropna(), bins=15)
            records = [{"bin": f"{edges[i]:.1f}", "count": int(counts[i])} for i in range(len(counts))]
            charts.append(ChartConfig(
                id=f"chart_{chart_id:03d}",
                type="bar",
                title=f"Distribution of {col.replace('_',' ').title()}",
                description="Histogram",
                data=records,
                x_key="bin",
                y_key="count",
                color=COLORS[0],
            ))

        return VisualizationResult(charts=charts)


def _safe_records(records):
    """Replace NaN/Inf with None for JSON safety."""
    out = []
    for r in records:
        clean = {}
        for k, v in r.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                clean[k] = None
            elif isinstance(v, (np.integer,)):
                clean[k] = int(v)
            elif isinstance(v, (np.floating,)):
                clean[k] = round(float(v), 4)
            else:
                clean[k] = v
        out.append(clean)
    return out
