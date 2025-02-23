import pandas as pd
import re
import io
import csv
import numpy as np

def parse_robinhood_csv(file_content: bytes) -> pd.DataFrame:
    # Parse CSV columns
    df = pd.read_csv(
        io.BytesIO(file_content),
        on_bad_lines='skip',         # Skip problematic lines
        quoting=csv.QUOTE_MINIMAL
    )
    
    # Rename columns for consistency
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
    for old_col, new_col in rename_map.items():
        if old_col in df.columns:
            df.rename(columns={old_col: new_col}, inplace=True)
    
    # Convert date columns and replace NaT with None
    for col in ["activity_date", "process_date", "settle_date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            df[col] = df[col].apply(lambda x: x if pd.notna(x) else None)
    
    # Convert numeric columns and replace NaN with None
    for col in ["quantity", "price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].apply(lambda x: x if pd.notna(x) else None)
    
    if "amount" in df.columns:
        # Convert amount to string and parse, then replace NaN with None
        df["amount"] = df["amount"].astype(str)
        df["amount"] = df["amount"].apply(parse_amount_string)
        df["amount"] = df["amount"].apply(lambda x: x if pd.notna(x) else None)
    
    # Create additional columns for parsed data
    df["parsed_action"] = None
    df["option_type"] = None
    df["strike_price"] = None
    df["option_expiration"] = None
    
    trade_code_map = {
        "BTO": "Buy to Open",
        "STC": "Sell to Close"
    }
    
    for idx, row in df.iterrows():
        desc = str(row.get("description", ""))
        code = str(row.get("trade_code", "")).upper().strip()
        
        parsed_action = trade_code_map.get(code, None)
        
        # Try to extract option details
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
    
    df = df.where(pd.notna(df), None)
    df = df.replace({pd.NaT: None})
    return df

def parse_amount_string(val: str) -> float:
    # Convert strings like "($110.00)" or "$120.00" into floats.
    val = val.strip()
    if not val or val.lower() in ["nan", "none"]:
        return None
    if val.startswith("(") and val.endswith(")"):
        val = "-" + val[1:-1]
    val = val.replace("$", "").replace(",", "")
    try:
        return float(val)
    except ValueError:
        return None
