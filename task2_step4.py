"""
Step 4: Visualize clusters — show sample products from each cluster.
"""
import pickle
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

products = pd.read_pickle("C:/Users/Parhavi G.V/products_clustered.pkl")
with open("C:/Users/Parhavi G.V/dbscan_model.pkl", "rb") as f:
    model = pickle.load(f)

labels = model["labels"]

clusters = sorted(set(labels))
clusters = [c for c in clusters if c != -1]

n_show = min(8, len(clusters))
if n_show == 0:
    print("No clusters found!")
else:
    fig, axes = plt.subplots(n_show, 6, figsize=(18, 3 * n_show))
    if n_show == 1:
        axes = [axes]

    for row, cid in enumerate(clusters[:n_show]):
        members = products[products["cluster"] == cid]
        cats = members["masterCategory"].unique()
        ax = axes[row]
        ax[0].text(0.5, 0.5, f"Cluster {cid}\n{len(members)} items\n{', '.join(cats[:3])}",
                   ha="center", va="center", fontsize=10, fontweight="bold",
                   bbox=dict(boxstyle="round", facecolor="#E8F0FE"))
        ax[0].axis("off")

        samples = members.sample(min(5, len(members)), random_state=42)
        for col, (_, item) in enumerate(samples.iterrows()):
            img = Image.open(item["image_path"]).convert("RGB")
            img = img.resize((200, 267), Image.NEAREST)
            ax[col + 1].imshow(img, interpolation="nearest")
            ax[col + 1].set_title(item["productDisplayName"][:20], fontsize=8)
            ax[col + 1].axis("off")

    fig.suptitle("Product Catalog Clusters (DBSCAN)", fontsize=16, fontweight="bold")
    plt.tight_layout()
    plt.savefig("C:/Users/Parhavi G.V/catalog_clusters.png", dpi=150, bbox_inches="tight")
    print("Saved: catalog_clusters.png")
