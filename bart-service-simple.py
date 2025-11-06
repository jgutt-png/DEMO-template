#!/usr/bin/env python3
"""
Simple BART inference service using HuggingFace InferenceClient
No local model loading - uses serverless inference
"""

from huggingface_hub import InferenceClient
import sys
import json
import os

# Your HuggingFace token from environment variable
HF_TOKEN = os.environ.get('HUGGINGFACE_API_KEY', 'your_huggingface_token_here')

# Initialize client
client = InferenceClient(token=HF_TOKEN)

def analyze_property(text):
    """Analyze property description with BART"""
    try:
        result = client.text_classification(
            text=text,
            model="interneuronai/real_estate_listing_analysis_bart"
        )
        # Convert to dict if needed
        if isinstance(result, list):
            return [{"label": r.label, "score": r.score} for r in result]
        return result
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    # Read text from command line argument
    if len(sys.argv) < 2:
        print("Usage: python3 bart-service-simple.py 'property description'")
        sys.exit(1)

    text = sys.argv[1]
    result = analyze_property(text)
    print(json.dumps(result, indent=2))
