# backend/auth_routes.py
from flask import Blueprint, request, jsonify, session
from models import User, db
from auth_utils import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({"message": "Username already taken"}), 400

    new_user = User(username=username, hashed_password=hash_password(password))
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password):
        return jsonify({"message": "Invalid credentials"}), 401

    session["user_id"] = user.id
    return jsonify({"message": "Logged in successfully"})

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out"})
