import os
import numpy as np
import pandas as pd
import faiss

print("=" * 60)
print("STEP 3: Build Search Index & Define Complement Rules")
print("=" * 60)

# Load saved data from Step 2
df = pd.read_pickle("products.pkl")
image_embeddings = np.load("embeddings.npy")
print(f"\nLoaded {len(df)} products, embeddings shape: {image_embeddings.shape}")

# ---- Build FAISS Index ----
print("\nBuilding FAISS search index...")
dim = image_embeddings.shape[1]
faiss_index = faiss.IndexFlatIP(dim)
faiss_index.add(image_embeddings.astype("float32"))
print(f"FAISS index ready: {faiss_index.ntotal} vectors, dimension {dim}")

# ---- Define Complementary Category Rules ----
COMPLEMENT_MAP = {
    "Running Shoes":   ["Socks", "Track Pants", "Tshirts", "Shorts", "Watches"],
    "Sports Shoes":    ["Socks", "Track Pants", "Shorts", "Tshirts"],
    "Sneakers":        ["Jeans", "Tshirts", "Socks", "Hoodies"],
    "Track Pants":     ["Tshirts", "Running Shoes", "Socks", "Sports Shoes"],
    "Formal Shoes":    ["Trousers", "Shirts", "Belts", "Socks", "Watches"],
    "Shirts":          ["Trousers", "Formal Shoes", "Belts", "Watches", "Jeans"],
    "Trousers":        ["Shirts", "Formal Shoes", "Belts", "Sweaters"],
    "Blazers":         ["Trousers", "Formal Shoes", "Shirts", "Belts"],
    "Jeans":           ["Tshirts", "Sneakers", "Casual Shoes", "Jackets", "Belts"],
    "Tshirts":         ["Jeans", "Shorts", "Sneakers", "Sunglasses", "Casual Shoes"],
    "Shorts":          ["Tshirts", "Sneakers", "Sports Sandals"],
    "Casual Shoes":    ["Jeans", "Tshirts", "Shorts", "Sneakers"],
    "Jackets":         ["Jeans", "Trousers", "Sneakers", "Tshirts", "Shirts"],
    "Hoodies":         ["Jeans", "Sneakers", "Tshirts", "Track Pants"],
    "Sweaters":        ["Trousers", "Jeans", "Formal Shoes", "Shirts"],
    "Watches":         ["Shirts", "Trousers", "Formal Shoes", "Belts", "Blazers"],
    "Belts":           ["Trousers", "Shirts", "Formal Shoes", "Jeans"],
    "Sunglasses":      ["Tshirts", "Shorts", "Jeans", "Casual Shoes"],
    "Bags":            ["Tshirts", "Jeans", "Sneakers", "Hoodies"],
    "Socks":           ["Running Shoes", "Sneakers", "Formal Shoes", "Sports Shoes"],
    "Heels":           ["Dresses", "Kurtas", "Handbags"],
    "Flats":           ["Jeans", "Kurtas", "Tshirts", "Salwar"],
    "Dresses":         ["Heels", "Handbags", "Sunglasses"],
    "Kurtas":          ["Trousers", "Flats", "Earrings", "Salwar"],
    "Salwar":          ["Kurtas", "Flats", "Heels"],
    "Handbags":        ["Heels", "Dresses", "Kurtas", "Saree"],
}

ALL_CATEGORIES = df["articleType"].unique().tolist()

print(f"\nComplement rules defined: {len(COMPLEMENT_MAP)} categories")
print(f"Categories in dataset: {len(ALL_CATEGORIES)}")

# Check which dataset categories have rules
covered = [c for c in ALL_CATEGORIES if c in COMPLEMENT_MAP]
print(f"Coverage: {len(covered)}/{len(ALL_CATEGORIES)} ({100*len(covered)/len(ALL_CATEGORIES):.0f}%)")

print("\nRules for key categories:")
for cat in ["Running Shoes", "Shirts", "Jeans", "Watches", "Sneakers", "Heels"]:
    if cat in COMPLEMENT_MAP:
        print(f"  {cat} -> {COMPLEMENT_MAP[cat]}")

# Save for next step
import pickle
with open("search_index.pkl", "wb") as f:
    pickle.dump({"faiss_index": faiss_index, "COMPLEMENT_MAP": COMPLEMENT_MAP, "ALL_CATEGORIES": ALL_CATEGORIES}, f)

print("\nSaved search_index.pkl")
print("STEP 3 COMPLETE")
