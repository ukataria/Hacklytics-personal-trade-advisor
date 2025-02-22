from datetime import datetime
from database import db

class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, index=True, nullable=False)
    hashed_password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Trade(db.Model):
    __tablename__ = "trades"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True, default=1)
   
    activity_date = db.Column(db.DateTime, nullable=True)
    process_date = db.Column(db.DateTime, nullable=True)
    settle_date = db.Column(db.DateTime, nullable=True)
    instrument = db.Column(db.String(100), nullable=True)
    description = db.Column(db.String(255), nullable=True)
    trade_code = db.Column(db.String(20), nullable=True) 
    quantity = db.Column(db.Float, nullable=True)
    price = db.Column(db.Float, nullable=True)
    amount = db.Column(db.Float, nullable=True)

    parsed_action = db.Column(db.String(50), nullable=True)  
    option_type = db.Column(db.String(10), nullable=True)   
    strike_price = db.Column(db.Float, nullable=True)
    option_expiration = db.Column(db.String(20), nullable=True)