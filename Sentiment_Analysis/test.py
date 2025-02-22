import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load the tokenizer from the base model checkpoint.
tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")
# Load your fine-tuned model from your directory.
model = AutoModelForSequenceClassification.from_pretrained("./finbert_finetuned")

# Define a mapping from label indices to sentiment strings.
sentiment_map = {0: "negative", 1: "neutral", 2: "positive"}

def classify_sentiment(text):
    # Tokenize the input text.
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    # Move inputs to GPU if available.
    if torch.cuda.is_available():
        inputs = {key: val.cuda() for key, val in inputs.items()}
        model.cuda()
    # Inference.
    with torch.no_grad():
        outputs = model(**inputs)
    # Get predicted label.
    logits = outputs.logits
    prediction = torch.argmax(logits, dim=-1).item()
    return sentiment_map[prediction]

# Test with sample texts.
test_texts = [
    "The company's earnings report exceeded expectations, causing a surge in the stock price.",
    "The market is experiencing significant uncertainty and volatility, leading to investor anxiety.",
    "Nvidia stock price crashed, investors pull back.",
    "Nvidia stock price went up, investors are happy"
]

for text in test_texts:
    sentiment = classify_sentiment(text)
    print(f"Text: {text}\nPredicted Sentiment: {sentiment}\n")
