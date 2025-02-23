# backend/modules/preprocessing.py

import pandas as pd

def calculate_trade_metrics(trade_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes basic metrics (duration, profit) by matching "Buy to Open"
    with "Sell to Close". If the price is missing, it attempts to derive it from the amount.
    """
    if "activity_date" not in trade_df.columns or "parsed_action" not in trade_df.columns:
        return pd.DataFrame()
    
    # Sort by activity date to process trades in chronological order
    trade_df = trade_df.sort_values("activity_date")
    
    # Create an incremental TradeID for each "Buy to Open" action
    trade_df["TradeID"] = (trade_df["parsed_action"] == "Buy to Open").cumsum()
    
    metrics = []
    for trade_id, group in trade_df.groupby("TradeID"):
        # Separate the buy and sell rows
        buy_rows = group[group["parsed_action"] == "Buy to Open"]
        sell_rows = group[group["parsed_action"] == "Sell to Close"]
        
        if not buy_rows.empty and not sell_rows.empty:
            buy_row = buy_rows.iloc[0]
            sell_row = sell_rows.iloc[0]
            
            # Calculate trade duration (in days)
            duration = (sell_row["activity_date"] - buy_row["activity_date"]).days
            
            # Determine the buy and sell prices
            buy_price = buy_row.get("price")
            if buy_price is None and buy_row.get("amount") is not None and buy_row.get("quantity"):
                buy_price = buy_row.get("amount") / buy_row.get("quantity")
            
            sell_price = sell_row.get("price")
            if sell_price is None and sell_row.get("amount") is not None and sell_row.get("quantity"):
                sell_price = sell_row.get("amount") / sell_row.get("quantity")
            
            # Get the trade quantity (defaulting to 0 if missing)
            qty = buy_row.get("quantity") or 0
            
            # Calculate profit if both prices are available
            profit = 0.0
            if buy_price is not None and sell_price is not None:
                profit = (sell_price - buy_price) * qty
            
            # Retrieve the ticker (assuming the buy row contains the correct ticker)
            ticker = buy_row.get("ticker", "UNKNOWN")
            
            metrics.append({
                "TradeID": trade_id,
                "Actions": f"{buy_row.get('parsed_action')} -> {sell_row.get('parsed_action')}",
                "BuyDate": buy_row.get("activity_date"),
                "SellDate": sell_row.get("activity_date"),
                "Duration": duration,
                "Profit": profit,
                "Ticker": ticker
            })
    
    return pd.DataFrame(metrics)
