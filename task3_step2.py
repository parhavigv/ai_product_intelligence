"""
Step 2: Encode a text query with CLIP and search for visual matches.
"""
import pickle
import numpy as np
import pandas as pd
from transformers import CLIPTokenizer, CLIPModel
import torch

tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_model.eval()

embeddings = np.load("C:/Users/Parhavi G.V/embeddings.npy")
products = pd.read_pickle("C:/Users/Parhavi G.V/products.pkl")
with open("C:/Users/Parhavi G.V/search_index.pkl", "rb") as f:
    data = pickle.load(f)
index = data["faiss_index"]

def search_by_text(query, k=5):
    inputs = tokenizer([query], padding=True, return_tensors="pt")
    with torch.no_grad():
        output = clip_model.get_text_features(**inputs)
        text_emb = output.pooler_output if hasattr(output, "pooler_output") else output[0]
        text_emb = text_emb / text_emb.norm(dim=-1, keepdim=True)
    text_emb = text_emb.cpu().numpy().astype("float32")
    D, I = index.search(text_emb, k)
    results = []
    for rank, (idx, score) in enumerate(zip(I[0], D[0])):
        p = products.iloc[idx]
        results.append({
            "rank": rank + 1,
            "name": p["productDisplayName"],
            "category": p["masterCategory"],
            "color": p.get("baseColour", "N/A"),
            "similarity": float(score),
            "image_path": p["image_path"],
        })
    return results

queries = [
    "red running shoes for men",
    "floral summer dress",
    "black leather formal shoes",
    "blue denim jeans",
]

for q in queries:
    print(f"\n{'='*60}")
    print(f"QUERY: \"{q}\"")
    print("=" * 60)
    results = search_by_text(q, k=5)
    for r in results:
        print(f"  #{r['rank']} {r['name'][:35]} | {r['category']} | {r['color']} | {r['similarity']:.3f}")
