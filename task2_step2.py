"""
Step 2: Find optimal DBSCAN parameters via nearest-neighbor distance analysis.
"""
import numpy as np
from sklearn.neighbors import NearestNeighbors
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

embeddings = np.load("C:/Users/Parhavi G.V/embeddings.npy")
print(f"Embeddings: {embeddings.shape}")

k = 5
nn = NearestNeighbors(n_neighbors=k+1, metric="cosine")
nn.fit(embeddings)
distances, _ = nn.kneighbors(embeddings)
k_distances = np.sort(distances[:, k])[::-1]

plt.figure(figsize=(10, 5))
plt.plot(k_distances)
plt.xlabel("Points (sorted)")
plt.ylabel(f"Distance to {k}th neighbor")
plt.title("DBSCAN eps Selection")
plt.grid(True, alpha=0.3)
plt.savefig("C:/Users/Parhavi G.V/distance_curve.png", dpi=150)
print("Saved: distance_curve.png")
print(f"\nDistance stats:")
print(f"  25th percentile: {np.percentile(k_distances, 25):.4f}")
print(f"  50th percentile: {np.percentile(k_distances, 50):.4f}")
print(f"  75th percentile: {np.percentile(k_distances, 75):.4f}")
print(f"  90th percentile: {np.percentile(k_distances, 90):.4f}")
print(f"  95th percentile: {np.percentile(k_distances, 95):.4f}")
