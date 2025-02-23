import subprocess

def generate_trade_recommendation(context: str) -> str:
    prompt = (
        f"""You only give advice based on the gaps found in trade data.
Your primary role is to identify and analyze gaps such as price discrepancies, volume anomalies, timing irregularities, or missing data points. 
You do not make predictions or provide general financial advice. Your insights are solely focused on explaining the causes and implications of these gaps, 
offering strategic responses, and highlighting potential opportunities or risks associated with them.
Based on the following trading patterns, sentiment insights, and market context,
provide actionable trading advice:
{context}
Recommendation:"""
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
