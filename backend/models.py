import yfinance as yf
import pandas as pd

def get_stock_data(ticker, start_date, end_date):
    """Collect stock data using yfinance with detailed logging."""
    print(f"Downloading stock data for {ticker}...")
    try:
        stock_data = yf.download(ticker, start=start_date, end=end_date)
        stock_data = stock_data.reset_index()
        print(f"Successfully downloaded {len(stock_data)} data points for {ticker}")
        return stock_data
    except Exception as e:
        print(f"Error downloading data for {ticker}: {e}")
        return pd.DataFrame()

print (get_stock_data('AAPL', '2020-01-01', '2020-12-31'))