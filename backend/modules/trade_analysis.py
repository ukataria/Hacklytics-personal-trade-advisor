import pandas as pd
from sklearn.cluster import KMeans

def flatten_dict_keys(d: dict) -> dict:
    """
    Convert tuple keys in the dictionary to strings by joining their elements with an underscore.
    """
    new_d = {}
    for key, value in d.items():
        if isinstance(key, tuple):
            new_key = "_".join(str(k) for k in key)
        else:
            new_key = key
        new_d[new_key] = value
    return new_d

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
    
    # Flatten the tuple keys in the summary dictionary.
    flat_summary = flatten_dict_keys(summary)
    
    return {"clusters": flat_summary, "trade_data": trade_metrics.to_dict(orient="records")}
