"""
Step 3: Run DBSCAN clustering + analyze results.
"""
import pickle
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

print("Loading embeddings...")
embeddings = np.load("C:/Users/Parhavi G.V/embeddings.npy")
products = pd.read_pickle("C:/Users/Parhavi G.V/products.pkl")

# Cosine distances are 0.06-0.15, so eps must be in that range
results = {}
for eps in [0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22]:
    db = DBSCAN(eps=eps, min_samples=3, metric="cosine", n_jobs=-1)
    labels = db.fit_predict(embeddings)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    results[eps] = (n_clusters, n_noise)
    print(f"eps={eps:.2f} -> {n_clusters} clusters, {n_noise} noise")

# Pick best: 30-80 clusters preferred, else highest clusters
best_eps = max(results, key=lambda e: results[e][0] if 10 <= results[e][0] <= 100 else 0)
if results[best_eps][0] < 5:
    best_eps = max(results, key=lambda e: results[e][0])
print(f"\nBest eps: {best_eps} ({results[best_eps][0]} clusters)")

db = DBSCAN(eps=best_eps, min_samples=3, metric="cosine", n_jobs=-1)
labels = db.fit_predict(embeddings)
products["cluster"] = labels

n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = (labels == -1).sum()
print(f"Final: {n_clusters} clusters, {n_noise} noise points ({n_noise/len(products)*100:.1f}%)")

print("\nCluster sizes:")
for cid in sorted(set(labels)):
    if cid == -1:
        print(f"  Noise: {(labels == -1).sum()}")
    else:
        members = products[products["cluster"] == cid]
        cats = members["masterCategory"].value_counts().head(3).index.tolist()
        print(f"  Cluster {cid}: {len(members)} items | {', '.join(cats)}")

products.to_pickle("C:/Users/Parhavi G.V/products_clustered.pkl")
with open("C:/Users/Parhavi G.V/dbscan_model.pkl", "wb") as f:
    pickle.dump({"eps": best_eps, "labels": labels, "n_clusters": n_clusters}, f)
print("\nSaved: products_clustered.pkl, dbscan_model.pkl")
