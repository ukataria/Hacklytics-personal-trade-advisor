from flask import Flask, request, jsonify, session
from flask_cors import CORS
from config import SQLALCHEMY_DATABASE_URI, SECRET_KEY
from database import db
from models import User, Trade
from auth_routes import auth_bp
from modules.trade_ingestion import parse_robinhood_csv
from modules.preprocessing import calculate_trade_metrics
from modules.trade_analysis import analyze_trade_patterns
from modules.market_data import get_stock_data, get_news_data
from modules.recommendation import generate_trade_recommendation
from modules.ensemble import create_final_recommendation
from modules.vector_store import VectorStore
from modules.sentiment import get_sentiment
import numpy as np
import pandas as pd
import datetime

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = SECRET_KEY


db.init_app(app)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

app.register_blueprint(auth_bp, url_prefix="/auth")

with app.app_context():
    db.create_all()

# Initialize vector store (or load an existing index)
vector_store = VectorStore()
# Optionally load: vector_store.load_index("faiss_index")

@app.route("/upload_trades", methods=["POST"])
def upload_trades():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401
    if "file" not in request.files:
        return jsonify({"message": "No file provided"}), 400
    file = request.files["file"]
    contents = file.read()
    try:
        parsed_df = parse_robinhood_csv(contents)
    except Exception as e:
        return jsonify({"message": f"Error parsing CSV: {str(e)}"}), 400
    user_id = session["user_id"]
    for _, row in parsed_df.iterrows():
        activity_date = row.get("activity_date")
        process_date = row.get("process_date")
        settle_date = row.get("settle_date")
        if pd.isna(activity_date): activity_date = None
        if pd.isna(process_date): process_date = None
        if pd.isna(settle_date): settle_date = None
        trade = Trade(
            user_id=user_id,
            activity_date=row.get("activity_date"),
            process_date=row.get("process_date"),
            settle_date=row.get("settle_date"),
            instrument=row.get("instrument"),
            description=row.get("description"),
            trade_code=row.get("trade_code"),
            quantity=row.get("quantity"),
            price=row.get("price"),
            amount=row.get("amount"),
            parsed_action=row.get("parsed_action"),
            option_type=row.get("option_type"),
            strike_price=row.get("strike_price"),
            option_expiration=row.get("option_expiration")
        )
        db.session.add(trade)
    db.session.commit()
    return jsonify({"message": "Trade data uploaded successfully."})

@app.route("/analyze", methods=["POST"])
def analyze_trades():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user_id = session["user_id"]
    trades = Trade.query.filter_by(user_id=user_id).all()
    if not trades:
        return jsonify({"message": "No trade data found. Please upload CSV first."}), 400
    
    # 1) Convert trades to a DataFrame
    trade_list = []
    for t in trades:
        trade_list.append({
            "activity_date": t.activity_date,
            "parsed_action": t.parsed_action,
            "price": t.price,
            "quantity": t.quantity,
            "ticker": t.instrument  # i.e. 'AAPL', 'TSLA', etc.
        })
    trade_df = pd.DataFrame(trade_list)

    # 2) If no data, return early
    if trade_df.empty:
        return jsonify({
            "message": "No trades to analyze.",
            "trade_patterns": {},
            "profit_by_ticker": [],
        })

    # 3) Calculate trade metrics (Duration, Profit, Ticker, etc.)
    trade_metrics = calculate_trade_metrics(trade_df)
    
    # 4) Analyze trade patterns (clusters, etc.)
    pattern_analysis = analyze_trade_patterns(trade_metrics)

    # 5) Summarize total profit by ticker for charts, etc.
    if "Ticker" in trade_metrics.columns and "Profit" in trade_metrics.columns:
        profit_summary = (
            trade_metrics.groupby("Ticker")["Profit"].sum().reset_index()
        )
        # Convert to a list of dicts like [{ticker: 'AAPL', total_profit: 123.45}, ...]
        profit_by_ticker = []
        for _, row in profit_summary.iterrows():
            profit_by_ticker.append({
                "ticker": row["Ticker"],
                "total_profit": float(row["Profit"])
            })
    else:
        profit_by_ticker = []

    # 6) Optionally fetch market data (e.g. last 180 days)
    tickers = trade_df["ticker"].dropna().unique()
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

    # 7) Sentiment / RAG approach
    aggregated_sentiment = {}
    for ticker in tickers:
        # e.g. random embedding for demonstration
        query_embedding = np.random.randn(vector_store.index.d).astype(np.float32)
        retrieved_docs = vector_store.search(query_embedding, top_k=3)
        sentiments = []
        for doc in retrieved_docs:
            content = doc.get("content", "")
            sscore = get_sentiment(content)
            sentiments.append(sscore)
        aggregated_sentiment[ticker] = float(np.mean(sentiments)) if sentiments else 0.0

    # 8) Build context + generate AI recommendation
    context_str = (
        f"Trade patterns: {pattern_analysis}. "
        f"Market data: {market_data_summary}. "
        f"Aggregated sentiment scores: {aggregated_sentiment}."
    )
    ai_rec = generate_trade_recommendation(context_str)
    final_rec = create_final_recommendation(
        pattern_analysis,
        {"market": market_data_summary, "sentiment": aggregated_sentiment},
        ai_rec
    )

    # 9) Attach the profit_by_ticker array to final_rec
    final_rec["profit_by_ticker"] = profit_by_ticker

    return jsonify(final_rec)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
