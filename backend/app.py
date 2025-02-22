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
from ensemble import create_final_recommendation
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
CORS(app)

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
    
    trade_list = []
    for t in trades:
        trade_list.append({
            "activity_date": t.activity_date,
            "parsed_action": t.parsed_action,
            "price": t.price,
            "quantity": t.quantity,
            "ticker": t.instrument
        })
    trade_df = pd.DataFrame(trade_list)
    
    if not trade_df.empty:
        trade_metrics = calculate_trade_metrics(trade_df)
        pattern_analysis = analyze_trade_patterns(trade_metrics)
    else:
        pattern_analysis = {"message": "No trades to analyze."}
    
    # Extract unique tickers from trade data
    tickers = trade_df["ticker"].dropna().unique()
    
    # Fetch market data for each ticker using get_stock_data
    market_data_summary = {}
    end_date = datetime.datetime.today().strftime("%Y-%m-%d")
    start_date = (datetime.datetime.today() - datetime.timedelta(days=180)).strftime("%Y-%m-%d")
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
    
    # (Optional) You could also fetch news data here using get_news_data
    
    # RAG: For each ticker, use the vector store and sentiment analysis to get aggregated sentiment
    aggregated_sentiment = {}
    for ticker in tickers:
        # Replace with your actual embedding function. For demonstration, using random vector.
        query_embedding = np.random.randn(vector_store.index.d).astype(np.float32)
        retrieved_docs = vector_store.search(query_embedding, top_k=3)
        sentiments = []
        for doc in retrieved_docs:
            content = doc.get("content", "")
            sscore = get_sentiment(content)
            sentiments.append(sscore)
        aggregated_sentiment[ticker] = float(np.mean(sentiments)) if sentiments else 0.0
    
    # Build final context for recommendation generation
    context_str = (
        f"Trade patterns: {pattern_analysis}. "
        f"Market data: {market_data_summary}. "
        f"Aggregated sentiment scores: {aggregated_sentiment}."
    )
    ai_rec = generate_trade_recommendation(context_str)
    final_rec = create_final_recommendation(pattern_analysis, {"market": market_data_summary, "sentiment": aggregated_sentiment}, ai_rec)
    
    return jsonify(final_rec)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
