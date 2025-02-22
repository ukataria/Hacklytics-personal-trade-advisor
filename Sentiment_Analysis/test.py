import os
import torch
import requests
import pandas as pd
import yfinance as yf
from bs4 import BeautifulSoup
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ========================
# CONFIGURATIONS
# ========================
SAVE_DIR = "news_articles"       # Directory to store raw text files
OUTPUT_CSV = "news_data.csv"      # Output CSV for articles
FINAL_CSV = "news_with_sentiment.csv"  # Final CSV with sentiment analysis
BATCH_SIZE = 32  # Adjust based on GPU memory

# ========================
# FETCH STOCK NEWS
# ========================
def get_news_data(tickers, news_count=10):
    """Retrieve news for a list of tickers using yfinance and save as CSV."""
    
    os.makedirs(SAVE_DIR, exist_ok=True)  # Ensure directory exists
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
                        save_article_text(ticker, article_text)
                    
                    all_news.append({'Ticker': ticker, 'Title': title, 'Link': link, 'Content': article_text})
        except Exception as e:
            print(f"Error fetching news for {ticker}: {e}")

    # Save data to CSV
    df_news = pd.DataFrame(all_news)
    df_news.to_csv(OUTPUT_CSV, index=False, encoding='utf-8')
    print(f"News data saved to {OUTPUT_CSV}")

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

def save_article_text(ticker, text):
    """Save article text to a file named after the ticker."""
    file_path = os.path.join(SAVE_DIR, f"{ticker}.txt")
    with open(file_path, "a", encoding="utf-8") as f:  # Append to file if multiple articles
        f.write(text + "\n\n" + "="*80 + "\n\n")  # Separate articles with a divider

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
        batch = texts[i:i+BATCH_SIZE]  # Get batch of articles
        
        # Tokenize batch
        inputs = tokenizer.batch_encode_plus(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )
        
        inputs = {key: val.to(device) for key, val in inputs.items()}  # Move to GPU if available
        
        # Run inference
        with torch.inference_mode():  # Faster than torch.no_grad()
            logits = model(**inputs).logits
            predictions = torch.argmax(logits, dim=-1).tolist()
        
        # Map predictions to sentiment labels
        sentiments.extend([sentiment_map[pred] for pred in predictions])
    
    return sentiments

def analyze_sentiment():
    """Load articles from CSV and apply sentiment analysis."""
    # Load CSV
    news_df = pd.read_csv(OUTPUT_CSV)

    # Ensure "Content" column exists
    if "Content" not in news_df.columns:
        raise ValueError("The CSV file does not contain a 'Content' column.")

    # Filter out empty or invalid articles
    valid_texts = news_df["Content"].fillna("").tolist()

    # Run sentiment analysis on all articles in batches
    news_df["Sentiment"] = classify_sentiment_batch(valid_texts)

    # Save updated results to a new CSV file
    news_df.to_csv(FINAL_CSV, index=False)
    
    print(f"Sentiment analysis complete. Results saved to {FINAL_CSV}")

# ========================
# EXECUTION
# ========================
if __name__ == "__main__":
    # Define tickers
    tickers = ["AAPL", "GOOGL", "MSFT"]

    # Step 1: Fetch news articles and save to CSV
    get_news_data(tickers)

    # Step 2: Perform sentiment analysis and save results
    analyze_sentiment()
