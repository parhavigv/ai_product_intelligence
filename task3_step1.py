"""
Step 1: Load CLIP model, embeddings, FAISS index, and product data.
"""
import pickle
import numpy as np
import pandas as pd
from transformers import CLIPTokenizer, CLIPModel

print("Loading CLIP model...")
tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_model.eval()
print("CLIP loaded")

print("Loading data...")
embeddings = np.load("C:/Users/Parhavi G.V/embeddings.npy")
products = pd.read_pickle("C:/Users/Parhavi G.V/products.pkl")
with open("C:/Users/Parhavi G.V/search_index.pkl", "rb") as f:
    data = pickle.load(f)
index = data["faiss_index"]
print(f"Embeddings: {embeddings.shape}")
print(f"Products: {len(products)}")
print(f"FAISS index: {index.ntotal} vectors")
