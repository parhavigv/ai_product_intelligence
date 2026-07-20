import os
import numpy as np
import pandas as pd
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel
import time

DATA_DIR = r"C:\Users\Parhavi G.V\.cache\kagglehub\datasets\paramaggarwal\fashion-product-images-small\versions\1"

print("=" * 60)
print("STEP 2: Load CLIP Model & Encode Product Images")
print("=" * 60)

# Load metadata
styles_df = pd.read_csv(os.path.join(DATA_DIR, "styles.csv"), on_bad_lines="skip")

def get_image_path(product_id):
    path = os.path.join(DATA_DIR, "images", f"{product_id}.jpg")
    return path if os.path.exists(path) else None

styles_df["image_path"] = styles_df["id"].apply(get_image_path)
df = styles_df.dropna(subset=["image_path"]).reset_index(drop=True)

# Sample 2000 products for manageable processing
SAMPLE_SIZE = 2000
df = df.sample(n=SAMPLE_SIZE, random_state=42).reset_index(drop=True)
print(f"\nWorking with {len(df)} products (sampled from {len(styles_df)})")

# ---- Load CLIP Model ----
print("\nLoading CLIP model (openai/clip-vit-base-patch32)...")
print("This downloads ~600MB on first run...")
start = time.time()
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
model.eval()
elapsed = time.time() - start
print(f"Model loaded in {elapsed:.1f} seconds")
print(f"Embedding dimension: {model.config.projection_dim}")

# ---- Encode Images ----
print(f"\nEncoding {len(df)} product images with CLIP...")

def encode_images(image_paths, batch_size=32):
    all_embeddings = []
    valid_indices = []
    total = len(image_paths)

    for i in range(0, total, batch_size):
        batch_paths = image_paths[i:i+batch_size]
        batch_images = []
        batch_valid = []

        for j, path in enumerate(batch_paths):
            try:
                img = Image.open(path).convert("RGB")
                batch_images.append(img)
                batch_valid.append(i + j)
            except:
                continue

        if not batch_images:
            continue

        inputs = processor(images=batch_images, return_tensors="pt", padding=True)
        with torch.no_grad():
            output = model.get_image_features(**inputs)
            if isinstance(output, torch.Tensor):
                embeddings = output
            else:
                embeddings = output.pooler_output if hasattr(output, "pooler_output") else output[0]
            embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)

        all_embeddings.append(embeddings.numpy())
        valid_indices.extend(batch_valid)

        if (i // batch_size) % 10 == 0:
            pct = min(i + batch_size, total) / total * 100
            print(f"  Encoded {min(i+batch_size, total)}/{total} ({pct:.0f}%)")

    return np.vstack(all_embeddings), valid_indices

start = time.time()
image_embeddings, valid_idx = encode_images(df["image_path"].tolist())
elapsed = time.time() - start

df = df.iloc[valid_idx].reset_index(drop=True)

print(f"\nDone in {elapsed:.1f} seconds")
print(f"Embedding matrix: {image_embeddings.shape}")
print(f"  -> {image_embeddings.shape[0]} products, {image_embeddings.shape[1]} dimensions each")
print(f"L2 norm check: {np.linalg.norm(image_embeddings[0]):.4f} (should be ~1.0)")

# Save for next steps
np.save("embeddings.npy", image_embeddings)
df.to_pickle("products.pkl")
print("\nSaved embeddings.npy and products.pkl")
print("STEP 2 COMPLETE")
