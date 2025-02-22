# backend/modules/trade_ingestion.py
import pandas as pd
import re
import io

def parse_robinhood_csv(file_content: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(file_content))
    
    # Rename columns to standard internal names
    rename_map = {
        "Activity Date": "activity_date",
        "Process Date": "process_date",
        "Settle Date": "settle_date",
        "Instrument": "instrument",
        "Description": "description",
        "Trans Code": "trade_code",
        "Quantity": "quantity",
        "Price": "price",
        "Amount": "amount"
    }
    for old, new in rename_map.items():
        if old in df.columns:
            df.rename(columns={old: new}, inplace=True)
    
    # converting date columns
    for col in ["activity_date", "process_date", "settle_date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    
    # converting numeric columns
    for col in ["quantity", "price", "amount"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    
    df["parsed_action"] = None
    df["option_type"] = None
    df["strike_price"] = None
    df["option_expiration"] = None
    
    trade_code_map = {
        "BTO": "Buy to Open",
        "STC": "Sell to Close",
        "STO": "Sell to Open",
        "BTC": "Buy to Close"
    }
    
    for idx, row in df.iterrows():
        desc = str(row.get("description", ""))
        code = str(row.get("trade_code", "")).upper().strip()
        
        parsed_action = trade_code_map.get(code, None)
        
        match = re.search(r"(\S+)\s+(\d{1,2}/\d{1,2}/\d{4})\s+(Call|Put)\s+\$(\d+(\.\d+)?)", desc)
        if match:
            df.at[idx, "option_type"] = match.group(3)
            df.at[idx, "option_expiration"] = match.group(2)
            df.at[idx, "strike_price"] = float(match.group(4))
            
            if "Assigned" in desc:
                parsed_action = "Assigned"
            elif "Expiration" in desc:
                parsed_action = "Expired"
        
        if not parsed_action:
            parsed_action = "Unknown"
        
        df.at[idx, "parsed_action"] = parsed_action
    
    return df
