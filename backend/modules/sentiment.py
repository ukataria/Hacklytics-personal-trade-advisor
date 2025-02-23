from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

MODEL_NAME = "/Users/utsav/Hacklytics-personal-trade-advisor/finbert_finetuned"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, local_files_only=True)

def get_sentiment(text: str) -> float:
    """
    Don't provide initial justification.
    Returns a sentiment score for the given text.
    For example, if the labels are [negative, neutral, positive], we can compute:
    sentiment_score = positive_score - negative_score.
    Adjust according to your model's specifics.
    """
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
    scores = torch.softmax(outputs.logits, dim=1)[0].tolist()  
    sentiment_score = scores[2] - scores[0]
    return sentiment_score
