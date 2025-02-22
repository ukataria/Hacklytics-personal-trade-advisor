import yfinance as yf
import pandas as pd
import requests
from bs4 import BeautifulSoup
import os
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
def get_news_data(tickers, news_count=10, save_dir="news_articles"):
    """Retrieve news for a list of tickers using yf.Search() and store article content in text files."""
    
    os.makedirs(save_dir, exist_ok=True)  # Ensure directory exists
    all_news = []

    for ticker in tickers:
        print(f"Fetching news for {ticker}...")
        try:
            news_data = yf.Search(ticker, news_count=news_count).news
            if news_data:
                for article in news_data:
                    title = article.get('title', 'No Title')
                    link = article.get('link', '')
                    article_text = extract_article_text(link) if link else "No Link"
                    
                    if article_text and article_text != "Failed to retrieve content":
                        save_article_text(ticker, article_text, save_dir)
                    
                    all_news.append({'Ticker': ticker, 'Title': title, 'Link': link, 'Content': article_text})
        except Exception as e:
            print(f"Error fetching news for {ticker}: {e}")

    df_news = pd.DataFrame(all_news)
    print(df_news.head())
    return df_news

def extract_article_text(url):
    """Extract text content from a given news article URL."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()  # Raise error for bad responses (4xx, 5xx)
        soup = BeautifulSoup(response.text, 'html.parser')

        paragraphs = soup.find_all('p')
        article_text = ' '.join([para.get_text() for para in paragraphs])
        return article_text if article_text else "No readable content"

    except Exception as e:
        print(f"Error extracting article from {url}: {e}")
        return "Failed to retrieve content"

def save_article_text(ticker, text, save_dir):
    """Save article text to a file named after the ticker."""
    file_path = os.path.join(save_dir, f"{ticker}.txt")
    with open(file_path, "a", encoding="utf-8") as f:  # Append to file if multiple articles
        f.write(text + "\n\n" + "="*80 + "\n\n")  # Separate articles with a divider


# Example Usage:
tickers = ["AAPL", "GOOGL", "MSFT"]
news_df = get_news_data(tickers)


#print(get_stock_data("AAPL", "2020-01-01", "2020-12-31").head())
#print(get_news_data())
