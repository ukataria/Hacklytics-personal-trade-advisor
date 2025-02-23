# Gappy: Trade Analysis and AI-Driven Recommendations

Gappy is a comprehensive pipeline designed to help users analyze their trade history, discover patterns, and receive AI-driven recommendations based on their trading behavior and current market conditions. The system integrates secure authentication, CSV ingestion, advanced analytics, market data retrieval, sentiment analysis, and an intuitive user interface.

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
   ```bash
   python -m venv venv
   source venv/bin/activate   # macOS / Linux
   # or venv\Scripts\activate on Windows