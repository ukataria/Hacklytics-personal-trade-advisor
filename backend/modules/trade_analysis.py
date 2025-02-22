import pandas as pd
from sklearn.cluster import KMeans

def analyze_trade_patterns(trade_metrics: pd.DataFrame) -> dict:
    features = trade_metrics[["Duration", "Profit"]].dropna().values
    if len(features) < 2:
        return {"message": "Not enough data to analyze patterns."}
    kmeans = KMeans(n_clusters=2, random_state=42).fit(features)
    trade_metrics["Cluster"] = kmeans.labels_
    summary = trade_metrics.groupby("Cluster").agg({
        "Duration": "mean",
        "Profit": ["mean", "count"]
    }).to_dict()
    return {"clusters": summary, "trade_data": trade_metrics.to_dict(orient="records")}
