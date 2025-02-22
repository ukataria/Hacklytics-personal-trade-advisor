import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")

SQLALCHEMY_DATABASE_URI = os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/tradeadvisor"
)