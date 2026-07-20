import os
import pandas as pd
from PIL import Image

DATA_DIR = r"C:\Users\Parhavi G.V\.cache\kagglehub\datasets\paramaggarwal\fashion-product-images-small\versions\1"

print("=" * 60)
print("STEP 1: Load Dataset")
print("=" * 60)

# Load metadata
styles_df = pd.read_csv(os.path.join(DATA_DIR, "styles.csv"), on_bad_lines="skip")
print(f"\nTotal products in CSV: {styles_df.shape[0]}")
print(f"Columns: {list(styles_df.columns)}")

# Link each product to its image file
def get_image_path(product_id):
    path = os.path.join(DATA_DIR, "images", f"{product_id}.jpg")
    return path if os.path.exists(path) else None

styles_df["image_path"] = styles_df["id"].apply(get_image_path)
df = styles_df.dropna(subset=["image_path"]).reset_index(drop=True)

print(f"\nProducts with images: {len(df)}")
print(f"Unique categories: {df['articleType'].nunique()}")

print("\nTop 15 product categories:")
print(df["articleType"].value_counts().head(15).to_string())

print("\nSample products:")
print(df[["id", "productDisplayName", "articleType", "baseColour"]].head(10).to_string())

# Show a sample image
sample_img = Image.open(df.iloc[0]["image_path"])
print(f"\nSample image size: {sample_img.size}")
print("STEP 1 COMPLETE")
