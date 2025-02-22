# # backend/modules/recommendation.py
# import torch
# from transformers import LlamaForCausalLM, LlamaTokenizer

# LLAMA_MODEL_PATH = "/path/to/your/local/llama_model"

# model = LlamaForCausalLM.from_pretrained(LLAMA_MODEL_PATH)
# tokenizer = LlamaTokenizer.from_pretrained(LLAMA_MODEL_PATH)

# def generate_trade_recommendation(context: str) -> str:
#     prompt = (
#         f"Based on the following trading patterns, sentiment insights, and market context, "
#         f"provide actionable trading advice:\n{context}\nRecommendation:"
#     )
#     inputs = tokenizer(prompt, return_tensors="pt")
#     with torch.no_grad():
#         outputs = model.generate(
#             inputs.input_ids,
#             max_length=100,
#             num_return_sequences=1,
#             do_sample=True,
#             top_p=0.9,
#             top_k=50
#         )
#     generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
#     recommendation = generated_text.split("Recommendation:")[-1].strip()
#     return recommendation

# backend/modules/recommendation.py
import subprocess

def generate_trade_recommendation(context: str) -> str:
    prompt = (
        f"Based on the following trading patterns, sentiment insights, and market context, "
        f"provide actionable trading advice:\n{context}\nRecommendation:"
    )
    try:
        # Call the Ollama CLI with the model name and pass the prompt via input
        result = subprocess.run(
            ["ollama", "run", "llama3.2"],
            input=prompt.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        generated_text = result.stdout.decode("utf-8").strip()
        # Post-process the generated text as needed
        recommendation = generated_text.split("Recommendation:")[-1].strip()
        return recommendation
    except subprocess.CalledProcessError as e:
        return f"Error: {e.stderr.decode('utf-8')}"
