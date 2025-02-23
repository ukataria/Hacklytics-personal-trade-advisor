# Gappy: Trade Analysis and AI-Driven Recommendations

G a p p y is a comprehensive pipeline designed to help users analyze their trade history, discover patterns, and receive AI-driven recommendations based on their trading behavior and current market conditions. The system integrates secure authentication, CSV ingestion, advanced analytics, market data retrieval, sentiment analysis, and an intuitive user interface.

---

## Features

- **Authentication**: Secure session-based login to protect user data.
- **CSV Ingestion**: Automatic parsing of Robinhood-like CSV exports.
- **Analytics & Clustering**: 
  - Calculation of trade durations and profits.
  - K-Means clustering for pattern discovery.
- **Market Data Integration**: Automatic retrieval of recent stock price data from `yfinance` (optional).
- **News Vector Store**: FAISS-based store for storing news embeddings and retrieving relevant articles.
- **Sentiment Analysis**: Fine-tuned FinBERT model for financial news sentiment scoring.
- **Retrieval-Augmented Generation (RAG)**: AI recommendations using a local model (Llama or Ollama-based) guided by user trade data and sentiment results.
- **UI Visualization**: React + Tailwind CSS interface displaying trade metrics, cluster summaries, and chart-based visualizations.

---

## Backend Setup

### Python Environment

1. Clone or download this repository.
2. Ensure you have Python 3.9+ installed.
3. (Optional) Create a virtual environment:
   python -m venv venv
   source venv/bin/activate or venv\Scripts\activate on Windows
4. Install the required packages:
   pip install -r requirements.txt

## Database Setup

G a p p y uses PostgreSQL by default. 
- In backend/config.py, update SQLALCHEMY_DATABASE_URI to match your local database settings, e.g.:
    - SQLALCHEMY_DATABASE_URI = "postgresql://<user>:<password>@localhost:5432/tradeadvisor"
    - Ensure that your Postgres server is running and that the database (tradeadvisor) exists

## Running the Server
- Navigate to the backend folder (or the root directory containing app.py).
- Export or set environment variables if needed (e.g., SECRET_KEY).
- Run the Flask server:
    - python app.py

## Frontend Set-Up

### Installing Dependencies

- Navigate to frontend/project
- run npm install

### Running the Frontend
- npm run dev
- By default, Vite will host the frontend on http://localhost:5173
- Ensure your Flask server (backend) is running at http://localhost:8000 (the default in app.py).
- Log in with your credentials (registered via the /auth/register endpoint)
- Upload a CSV file of trades and click Analyze to see the resulting analysis.

## Technical Components

### Data Ingestion

- **Robinhood CSV**: The `parse_robinhood_csv` function in `modules/trade_ingestion.py` standardizes columns and extracts fields like `parsed_action` (BTO/STC) and optional option data (strike, expiration).
- **Database**: The ingested trades are stored in a `trades` table, associated with a user ID.

### Trade Analysis

- **Preprocessing**: `calculate_trade_metrics` matches each “Buy to Open” with the corresponding “Sell to Close” to compute Duration and Profit.
- **Clustering**: `analyze_trade_patterns` uses K-Means to find patterns in Duration and Profit, returning cluster statistics and an array of trade data.

### Vector Store & Sentiment

- **FAISS**: A high-performance vector store that indexes embeddings (e.g., from a random or a real embedding model) to retrieve relevant documents for a given ticker.
- **FinBERT**: A local model that calculates sentiment scores for each retrieved article, used to gauge the market’s overall positivity or negativity around a specific ticker.

### AI Recommendation (RAG)

- **Retrieval-Augmented Generation**: Gappy combines the user’s trade patterns, market data, and aggregated sentiment into a prompt string, then queries a local Llama-based model (or Ollama CLI).
- **Personalized Advice**: The model’s output is appended to the JSON response as `personalized_advice`.