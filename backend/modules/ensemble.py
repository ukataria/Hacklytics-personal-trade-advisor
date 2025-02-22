def create_final_recommendation(trade_analysis: dict, market_data: dict, generative_rec: str) -> dict:
    return {
        "trade_patterns": trade_analysis,
        "market_summary": market_data,
        "personalized_advice": generative_rec
    }
