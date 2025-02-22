import yfinance as yf
import pandas as pd
import requests
from bs4 import BeautifulSoup
import os
import requests_cache
from concurrent.futures import ThreadPoolExecutor

# Enable caching for HTTP requests to avoid redundant network calls
session = requests_cache.CachedSession('news_cache', expire_after=1800)  # Cache expires in 30 minutes

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

def get_news_data(tickers, news_count=20, save_dir="news_articles"):
    """Retrieve news for multiple tickers using multithreading and optimized file writing."""
    
    os.makedirs(save_dir, exist_ok=True)  # Ensure directory exists
    all_news = []  # Store all news data

    def process_ticker(ticker):
        """Fetch news for a single ticker and save articles efficiently."""
        print(f"Fetching news for {ticker}...")
        try:
            news_data = yf.Search(ticker, news_count=news_count).news
            if news_data:
                all_articles = []  # Collect articles for batch writing
                for article in news_data:
                    title = article.get('title', 'No Title')
                    link = article.get('link', '')
                    article_text = extract_article_text(link) if link else "No Link"
                    
                    if article_text and article_text != "Failed to retrieve content":
                        all_articles.append(article_text)

                    all_news.append({'Ticker': ticker, 'Title': title, 'Link': link, 'Content': article_text})

                # Batch write articles for this ticker
                if all_articles:
                    save_article_text(ticker, all_articles, save_dir)
        except Exception as e:
            print(f"Error fetching news for {ticker}: {e}")

    # Use multithreading to speed up fetching news for multiple tickers
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(process_ticker, tickers)

    df_news = pd.DataFrame(all_news)
    print(df_news.head())
    return df_news

def extract_article_text(url):
    """Extract text content from a given news article using caching."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = session.get(url, headers=headers)
        response.raise_for_status()  # Raise error for bad responses (4xx, 5xx)
        soup = BeautifulSoup(response.text, 'html.parser')

        paragraphs = soup.find_all('p')
        article_text = ' '.join([para.get_text() for para in paragraphs])
        return article_text if article_text else "No readable content"
    except Exception as e:
        print(f"Error extracting article from {url}: {e}")
        return "Failed to retrieve content"

def save_article_text(ticker, articles, save_dir):
    """Save all articles for a ticker in a single write operation."""
    file_path = os.path.join(save_dir, f"{ticker}.txt")
    with open(file_path, "w", encoding="utf-8") as f:  # Open once for batch write
        f.write("\n\n".join(articles) + "\n\n" + "="*80 + "\n\n")

# Example Usage
tickers = ["AAPL", "GOOGL", "MSFT"]
news_df = get_news_data(tickers)
