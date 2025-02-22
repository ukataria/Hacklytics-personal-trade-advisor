# backend/app.py
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from config import SQLALCHEMY_DATABASE_URI, SECRET_KEY
from database import db
from models import User, Trade
from auth_routes import auth_bp  # Our user auth blueprint
from modules.trade_ingestion import parse_robinhood_csv
from modules.preprocessing import calculate_trade_metrics
from modules.trade_analysis import analyze_trade_patterns
from modules.market_data import fetch_historical_data, fetch_live_price
from modules.recommendation import generate_trade_recommendation
from modules.ensemble import create_final_recommendation

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = SECRET_KEY

db.init_app(app)
CORS(app)

# Register blueprint for auth routes
app.register_blueprint(auth_bp, url_prefix="/auth")

with app.app_context():
    db.create_all()

############################
# CSV UPLOAD ENDPOINT
############################
@app.route("/upload_trades", methods=["POST"])
def upload_trades():
    """
    Expects a file named 'file' in the request (multipart/form-data).
    CSV with columns: Activity Date, Process Date, Settle Date, Instrument, Description,
    Trans Code, Quantity, Price, Amount
    """
    # Optional: check if user is logged in by session["user_id"] if you want to restrict
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

############################
# ANALYSIS ENDPOINT
############################
@app.route("/analyze", methods=["POST"])
def analyze_trades():
    """
    Fetch trades for the logged-in user, run analysis, fetch market data, produce recommendation.
    """
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    user_id = session["user_id"]
    trades = Trade.query.filter_by(user_id=user_id).all()
    
    if not trades:
        return jsonify({"message": "No trade data found. Please upload CSV first."}), 400
    
    # Convert trades to a DataFrame
    import pandas as pd
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
    
    # Compute metrics
    if not trade_df.empty:
        trade_metrics = calculate_trade_metrics(trade_df)
        pattern_analysis = analyze_trade_patterns(trade_metrics)
    else:
        pattern_analysis = {"message": "No trades to analyze."}
    
    # Market data
    tickers = trade_df["ticker"].dropna().unique()
    market_data_summary = {}
    for ticker in tickers:
        try:
            hist_data = fetch_historical_data(ticker, period="6mo")
            live_price = fetch_live_price(ticker)
            market_data_summary[ticker] = {
                "live_price": live_price,
                "recent_close": float(hist_data["Close"].iloc[-1]) if not hist_data.empty else None
            }
        except Exception as e:
            market_data_summary[ticker] = {"error": str(e)}
    
    # GPT-2 recommendation
    context_str = f"Trade patterns: {pattern_analysis}. Market data: {market_data_summary}."
    ai_rec = generate_trade_recommendation(context_str)
    final_rec = create_final_recommendation(pattern_analysis, market_data_summary, ai_rec)
    
    return jsonify(final_rec)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
