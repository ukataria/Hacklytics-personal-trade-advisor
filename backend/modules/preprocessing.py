import pandas as pd

def calculate_trade_metrics(trade_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes basic metrics (duration, profit) by matching "Buy to Open"
    with "Sell to Close". Adjust the logic as needed.
    """
    if "activity_date" not in trade_df.columns or "parsed_action" not in trade_df.columns:
        return pd.DataFrame()
    
    trade_df = trade_df.sort_values("activity_date")
    trade_df["TradeID"] = (trade_df["parsed_action"] == "Buy to Open").cumsum()
    
    metrics = []
    for trade_id, group in trade_df.groupby("TradeID"):
        buy_rows = group[group["parsed_action"] == "Buy to Open"]
        sell_rows = group[group["parsed_action"] == "Sell to Close"]
        if not buy_rows.empty and not sell_rows.empty:
            buy_row = buy_rows.iloc[0]
            sell_row = sell_rows.iloc[0]
            duration = (sell_row["activity_date"] - buy_row["activity_date"]).days
            profit = 0.0
            if pd.notnull(buy_row.get("price")) and pd.notnull(sell_row.get("price")):
                qty = buy_row.get("quantity", 0)
                profit = (sell_row.get("price", 0) - buy_row.get("price", 0)) * qty
            metrics.append({
                "TradeID": trade_id,
                "Actions": f"{buy_row.get('parsed_action')} -> {sell_row.get('parsed_action')}",
                "BuyDate": buy_row.get("activity_date"),
                "SellDate": sell_row.get("activity_date"),
                "Duration": duration,
                "Profit": profit
            })
    
    return pd.DataFrame(metrics)