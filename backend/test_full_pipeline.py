# backend/test_full_pipeline.py
import pandas as pd
import numpy as np
import datetime

# Import our modules
from modules.trade_ingestion import parse_robinhood_csv
from modules.market_data import get_stock_data, get_news_data
from modules.preprocessing import calculate_trade_metrics
from modules.trade_analysis import analyze_trade_patterns
from modules.sentiment import get_sentiment
from modules.vector_store import VectorStore

# We'll use SentenceTransformer for computing embeddings for news content.
from sentence_transformers import SentenceTransformer

def test_pipeline():
    # 1. Read CSV from disk
    csv_file_path = "example.csv"
    with open(csv_file_path, "rb") as f:
        csv_bytes = f.read()
    
    # Parse CSV using trade_ingestion.py
    trade_df = parse_robinhood_csv(csv_bytes)
    print("Parsed Trade Data:")
    print(trade_df)
    
    # 2. Extract unique tickers from trade data (assumed in 'instrument' column)
    if "instrument" in trade_df.columns:
        tickers = trade_df["instrument"].dropna().unique()
    else:
        print("Column 'instrument' not found in parsed data. Columns found:", trade_df.columns)
        tickers = []
    print("\nUnique Tickers from Trade Data:", tickers)
    
    # 3. Retrieve market data for each ticker (stock data)
    end_date = datetime.datetime.today().strftime("%Y-%m-%d")
    start_date = (datetime.datetime.today() - datetime.timedelta(days=180)).strftime("%Y-%m-%d")
    market_data_summary = {}
    for ticker in tickers:
        try:
            stock_data = get_stock_data(ticker, start_date, end_date)
            if not stock_data.empty:
                recent_close = float(stock_data["Close"].iloc[-1])
            else:
                recent_close = None
            market_data_summary[ticker] = {
                "recent_close": recent_close,
                "data_points": len(stock_data)
            }
        except Exception as e:
            market_data_summary[ticker] = {"error": str(e)}
    print("\nMarket Data Summary:")
    print(market_data_summary)
    
    # 4. Retrieve news data for these tickers
    news_df = get_news_data(tickers, news_count=5, save_dir="news_articles")
    print("\nNews Data (first few rows):")
    print(news_df.head())
    
    # 5. Compute trade metrics and clustering
    if not trade_df.empty:
        trade_metrics = calculate_trade_metrics(trade_df)
        pattern_analysis = analyze_trade_patterns(trade_metrics)
    else:
        pattern_analysis = {"message": "No trades to analyze."}
    print("\nTrade Analysis:")
    print(pattern_analysis)
    
    # 6. Test vector embedding: compute embeddings for one news article per ticker
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    vector_store = VectorStore()
    
    for ticker in tickers:
        ticker_news = news_df[news_df['Ticker'] == ticker]
        for _, row in ticker_news.iterrows():
            content = row.get("Content", "")
            if content and content != "Failed to retrieve content":
                embedding = embedding_model.encode(content)
                metadata = {
                    "Ticker": ticker,
                    "Title": row.get("Title", ""),
                    "Content": content
                }
                vector_store.add_document(embedding, metadata)
    
    # 7. Test retrieval: use a query related to one ticker
    sample_query = "What are the latest updates on Apple earnings?"
    query_embedding = embedding_model.encode(sample_query)
    results = vector_store.search(query_embedding, top_k=2)
    
    print("\nVector Store Search Results for Query:")
    for res in results:
        print(f"Ticker: {res.get('Ticker')}, Title: {res.get('Title')}")
        print(f"Content Snippet: {res.get('Content')[:200]}...\n")
    
    # 8. Test sentiment analysis on a retrieved document
    if results:
        sample_text = results[0].get("Content", "")
        sentiment_score = get_sentiment(sample_text)
        print("Sample Sentiment Score:", sentiment_score)

if __name__ == "__main__":
    test_pipeline()
