"""
Step 3: Full reverse search with visualization.
"""
import pickle
import numpy as np
import pandas as pd
from PIL import Image
from transformers import CLIPTokenizer, CLIPModel
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
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

def visualize_search(query, results):
    n = len(results)
    fig, axes = plt.subplots(1, n, figsize=(5 * n, 6))
    if n == 1:
        axes = [axes]
    for i, r in enumerate(results):
        ax = axes[i]
        img = Image.open(r["image_path"]).convert("RGB")
        img = img.resize((300, 400), Image.NEAREST)
        ax.imshow(img, interpolation="nearest")
        pct = r["similarity"] * 100
        ax.set_title(f"#{r['rank']} [{r['category']}]\n{r['name'][:25]}\n{r['color']} | {pct:.0f}%", fontsize=10)
        ax.axis("off")
        for spine in ax.spines.values():
            spine.set_visible(True)
            spine.set_color("#057642")
            spine.set_linewidth(2)
    fig.suptitle(f'Reverse Search: "{query}"', fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig("C:/Users/Parhavi G.V/search_result.png", dpi=150, bbox_inches="tight")
    plt.show()
    print("Saved: search_result.png")

queries = ["red running shoes", "black leather formal shoes", "blue denim jeans"]
for q in queries:
    results = search_by_text(q, k=5)
    print(f"\nQuery: \"{q}\"")
    for r in results:
        print(f"  #{r['rank']} {r['name'][:35]} | {r['category']} | {r['similarity']:.3f}")
    visualize_search(q, results)
