import numpy as np
import pandas as pd
import pickle
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from PIL import Image

print("=" * 60)
print("STEP 4: Run Recommendations & Visualize")
print("=" * 60)

# Load everything
df = pd.read_pickle("products.pkl")
image_embeddings = np.load("embeddings.npy")
with open("search_index.pkl", "rb") as f:
    data = pickle.load(f)
faiss_index = data["faiss_index"]
COMPLEMENT_MAP = data["COMPLEMENT_MAP"]

def recommend_complementary(product_idx, top_k=6):
    """Find complementary products for a given product."""
    product = df.iloc[product_idx]
    product_name = product["productDisplayName"]
    product_category = product["articleType"]
    product_emb = image_embeddings[product_idx:product_idx+1].astype("float32")

    print(f"\n{'='*55}")
    print(f"INPUT: {product_name}")
    print(f"Category: {product_category} | Color: {product['baseColour']}")
    print(f"{'='*55}")

    # Get complementary categories
    comp_cats = COMPLEMENT_MAP.get(product_category, [])
    if not comp_cats:
        other = [c for c in df["articleType"].unique() if c != product_category]
        comp_cats = np.random.choice(other, size=min(5, len(other)), replace=False).tolist()

    print(f"Searching in: {comp_cats}")

    # Find best matches in each complementary category
    candidates = []
    for cat in comp_cats:
        cat_indices = np.where(df["articleType"] == cat)[0]
        if len(cat_indices) == 0:
            continue

        cat_embs = image_embeddings[cat_indices].astype("float32")
        sims = np.dot(cat_embs, product_emb.T).flatten()

        # Top 2 from this category
        top_local = np.argsort(sims)[-2:][::-1]
        print(f"  [{cat}] {len(cat_indices)} products, best sim: {sims[top_local[0]]:.4f}")

        for local_idx in top_local:
            global_idx = cat_indices[local_idx]
            candidates.append({
                "idx": int(global_idx),
                "name": df.iloc[global_idx]["productDisplayName"],
                "category": cat,
                "color": df.iloc[global_idx]["baseColour"],
                "similarity": float(sims[local_idx]),
                "image_path": df.iloc[global_idx]["image_path"]
            })

    # Sort and deduplicate
    candidates.sort(key=lambda x: x["similarity"], reverse=True)
    seen = set()
    unique = []
    for c in candidates:
        if c["idx"] not in seen:
            seen.add(c["idx"])
            unique.append(c)

    return {
        "input_name": product_name,
        "input_category": product_category,
        "input_image": product["image_path"],
        "recommendations": unique[:top_k]
    }

def visualize(result):
    """Show input product + recommendations side by side."""
    recs = result["recommendations"]
    n = len(recs) + 1

    fig, axes = plt.subplots(1, n, figsize=(5 * n, 7))
    if n == 1:
        axes = [axes]

    # Input
    ax = axes[0]
    img = Image.open(result["input_image"]).convert("RGB")
    img = img.resize((300, 400), Image.NEAREST)  # upscale with nearest neighbor for sharpness
    ax.imshow(img, interpolation="nearest")
    ax.set_title(f"INPUT\n{result['input_name'][:30]}\n({result['input_category']})", fontsize=11, fontweight="bold", color="#0A66C2")
    ax.axis("off")
    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_color("#0A66C2")
        spine.set_linewidth(4)

    # Recommendations
    for i, rec in enumerate(recs):
        ax = axes[i + 1]
        img = Image.open(rec["image_path"]).convert("RGB")
        img = img.resize((300, 400), Image.NEAREST)
        ax.imshow(img, interpolation="nearest")
        pct = rec["similarity"] * 100
        ax.set_title(f"#{i+1} [{rec['category']}]\n{rec['name'][:28]}\n{pct:.0f}% match", fontsize=10)
        ax.axis("off")
        for spine in ax.spines.values():
            spine.set_visible(True)
            spine.set_color("#057642")
            spine.set_linewidth(2)

    fig.suptitle("Complementary Product Recommendations", fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig("recommendation_result.png", dpi=150, bbox_inches="tight")
    plt.show()
    print("Saved: recommendation_result.png")

# ---- TEST 1: Running Shoes ----
running = df[df["articleType"] == "Running Shoes"]
if len(running) > 0:
    result = recommend_complementary(running.index[0], top_k=5)
    print(f"\nTop recommendations:")
    for i, r in enumerate(result["recommendations"]):
        print(f"  {i+1}. [{r['category']}] {r['name']} (sim: {r['similarity']:.4f})")
    visualize(result)

# ---- TEST 2: Shirt ----
shirts = df[df["articleType"] == "Shirts"]
if len(shirts) > 0:
    result = recommend_complementary(shirts.index[0], top_k=5)
    print(f"\nTop recommendations:")
    for i, r in enumerate(result["recommendations"]):
        print(f"  {i+1}. [{r['category']}] {r['name']} (sim: {r['similarity']:.4f})")
    visualize(result)

# ---- TEST 3: Jeans ----
jeans = df[df["articleType"] == "Jeans"]
if len(jeans) > 0:
    result = recommend_complementary(jeans.index[0], top_k=5)
    print(f"\nTop recommendations:")
    for i, r in enumerate(result["recommendations"]):
        print(f"  {i+1}. [{r['category']}] {r['name']} (sim: {r['similarity']:.4f})")
    visualize(result)

print("\n" + "=" * 60)
print("STEP 4 COMPLETE — All 3 tests done!")
print("=" * 60)
print("\nGenerated images:")
print("  recommendation_result.png (shown 3 times)")
