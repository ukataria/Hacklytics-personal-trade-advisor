import yfinance as yf

def fetch_historical_data(ticker: str, period: str = "6mo"):
    stock = yf.Ticker(ticker)
    df = stock.history(period=period)
    return df

def fetch_live_price(ticker: str) -> float:
    stock = yf.Ticker(ticker)
    price = stock.history(period="1d")['Close'][-1]
    return float(price)
