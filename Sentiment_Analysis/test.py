import os
import time
import torch
import requests
import pandas as pd
import yfinance as yf
from bs4 import BeautifulSoup
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========================
# CONFIGURATIONS
# ========================
SAVE_DIR = "news_articles"       # Directory to store raw text files
OUTPUT_CSV = "news_data.csv"      # Output CSV for articles
FINAL_CSV = "news_with_sentiment.csv"  # Final CSV with sentiment analysis
BATCH_SIZE = 32  # Optimal batch size for speed
NUM_WORKERS = 5  # Threads for parallel fetching

# ========================
# FETCH STOCK NEWS
# ========================
def get_news_data(tickers, news_count=10):
    """Retrieve news for a list of tickers using yfinance and save as CSV."""
    
    os.makedirs(SAVE_DIR, exist_ok=True)  # Ensure directory exists
    all_news = []

    def fetch_news(ticker):
        """Fetch news articles for a single ticker."""
        print(f"Fetching news for {ticker}...")
        ticker_news = []
        try:
            search = yf.Search(ticker)
            if not hasattr(search, 'news') or search.news is None:
                print(f"No news found for {ticker}")
                return []

            for article in search.news[:news_count]:  # Limit articles per ticker
                title = article.get('title', 'No Title')
                link = article.get('link', '')

                ticker_news.append({'Ticker': ticker, 'Title': title, 'Link': link})

            time.sleep(1)  # Prevent rate limiting
        
        except Exception as e:
            print(f"Error fetching news for {ticker}: {e}")
        
        return ticker_news

    # Run scraping in parallel
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(fetch_news, ticker): ticker for ticker in tickers}
        for future in as_completed(futures):
            all_news.extend(future.result())

    # Save data to CSV
    df_news = pd.DataFrame(all_news)
    df_news.to_csv(OUTPUT_CSV, index=False, encoding='utf-8')
    print(f"✅ News data saved to {OUTPUT_CSV}")

    return df_news

# ========================
# SENTIMENT ANALYSIS
# ========================
# Load the tokenizer and model
tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")
model = AutoModelForSequenceClassification.from_pretrained("./finbert_finetuned")

# Move model to GPU if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()  # Set model to evaluation mode

# Define sentiment mapping
sentiment_map = {0: "negative", 1: "neutral", 2: "positive"}

def classify_sentiment_batch(texts):
    """Classify sentiment for a batch of texts using FinBERT."""
    sentiments = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i+BATCH_SIZE]  # Get batch of titles
        
        # Remove very short or empty titles
        batch = [text for text in batch if len(text.strip()) > 3]
        if not batch:
            sentiments.extend(["unknown"] * len(batch))
            continue

        # Tokenize batch
        inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True, max_length=128)

        inputs = {key: val.to(device) for key, val in inputs.items()}  # Move to GPU if available
        
        # Run inference
        with torch.inference_mode():
            logits = model(**inputs).logits
            predictions = torch.argmax(logits, dim=-1).tolist()
        
        # Map predictions to sentiment labels
        sentiments.extend([sentiment_map[pred] for pred in predictions])
    
    return sentiments

def analyze_sentiment():
    """Load article titles from CSV and apply sentiment analysis."""
    # Load CSV
    news_df = pd.read_csv(OUTPUT_CSV)

    # Ensure "Title" column exists
    if "Title" not in news_df.columns:
        raise ValueError("The CSV file does not contain a 'Title' column.")

    # Filter out empty or invalid titles
    valid_titles = news_df["Title"].fillna("").tolist()

    # Run sentiment analysis on all titles in batches
    news_df["Sentiment"] = classify_sentiment_batch(valid_titles)

    # Save updated results to a new CSV file
    news_df.to_csv(FINAL_CSV, index=False, encoding='utf-8')
    
    print(f"✅ Sentiment analysis complete. Results saved to {FINAL_CSV}")

# ========================
# EXECUTION
# ========================
if __name__ == "__main__":
    # Define tickers
    tickers = ["AAPL", "GOOGL", "MSFT"]

    # Step 1: Fetch news article titles (Parallelized)
    get_news_data(tickers)

    # Step 2: Perform sentiment analysis on titles
    analyze_sentiment()
