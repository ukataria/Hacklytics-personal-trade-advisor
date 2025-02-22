# note we gotta make changes based on using a local LLAMA model instead
from transformers import GPT2LMHeadModel, GPT2Tokenizer

model = GPT2LMHeadModel.from_pretrained("gpt2")
tokenizer = GPT2Tokenizer.from_pretrained("gpt2")

def generate_trade_recommendation(context: str) -> str:
    prompt = (
        f"Based on the following trading patterns and market conditions, "
        f"provide actionable trading advice:\n{context}\nRecommendation:"
    )
    inputs = tokenizer.encode(prompt, return_tensors="pt")
    outputs = model.generate(
        inputs, max_length=100, num_return_sequences=1,
        do_sample=True, top_p=0.9, top_k=50
    )
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    recommendation = generated_text.split("Recommendation:")[-1].strip()
    return recommendation
