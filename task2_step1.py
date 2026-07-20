"""
Step 1: Load embeddings + product data from Task 1.
"""
import pickle
import numpy as np
import pandas as pd

print("Loading data...")
products = pd.read_pickle("C:/Users/Parhavi G.V/products.pkl")
embeddings = np.load("C:/Users/Parhavi G.V/embeddings.npy")

print(f"Products: {len(products)}")
print(f"Embeddings: {embeddings.shape}")
print(f"Categories: {products['masterCategory'].nunique()} unique")
print(products['masterCategory'].value_counts().to_string())
