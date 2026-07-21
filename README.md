# AI Product Intelligence System

## Gen AI Bootcamp - Day 2 Challenge

An AI-powered product intelligence system that understands fashion products from images, generates product metadata, and enables text-based product search using **CLIP embeddings** and **vector search**.

---

## Architecture

```
CLIP Model (openai/clip-vit-base-patch32)
    |-- Image Encoder: Product images -> 512-dim embeddings
    |-- Text Encoder:  Text queries   -> 512-dim embeddings
    |-- Shared Space:  Images & text in same vector space

Task 1: Complementary Recommendations
    Category Rules + CLIP Visual Similarity -> Ranked complementary products

Task 2: Unique Catalog
    CLIP Embeddings + DBSCAN Clustering -> Deduplicated catalog

Task 3: Reverse Search
    CLIP Text Encoding + FAISS Index -> Text-to-image retrieval
```

## Tasks

### Task 1: Smart Product Recommendation Engine

**Problem:** E-commerce platforms need to recommend products that are commonly purchased together, not just visually similar items.

**Solution:** A hybrid approach combining domain knowledge (complementarity rules) with CLIP visual similarity.

**How it works:**
1. **Complement Map** - A curated dictionary maps each product category (e.g., "Running Shoes") to complementary categories (e.g., "Socks", "Track Pants", "Tshirts")
2. **Cross-Category Similarity** - For each complementary category, CLIP embeddings find the best visual match
3. **Ranking** - Candidates are ranked by embedding similarity score

**Results:**
| Input Product | Top Recommendations |
|---------------|-------------------|
| Running Shoe | Sports Shoes, Socks, Track Pants, Tshirts |
| Formal Shirt | Trousers, Formal Shoes, Belts, Watches |
| Jeans | Tshirts, Casual Shoes, Sneakers, Jackets |

### Task 2: Unique Product Catalog Creation

**Problem:** Large marketplaces contain duplicate/near-duplicate products uploaded by different sellers.

**Solution:** DBSCAN clustering on CLIP embeddings to group near-identical products.

**How it works:**
1. **CLIP Encoding** - Each product image is encoded into a 512-dimensional embedding
2. **DBSCAN Clustering** - Products within cosine distance threshold are grouped together
3. **Representative Selection** - One product from each cluster becomes the catalog entry

**Results:**
- 2000 products -> 18 unique clusters
- 13.1% noise (truly unique products)
- Duplication rate reduced significantly

### Task 3: Reverse Product Search

**Problem:** Users want to search products using natural language descriptions instead of images.

**Solution:** CLIP text-to-image retrieval with FAISS indexing.

**How it works:**
1. **Text Encoding** - User query is encoded using CLIP's text encoder into the same 512-dim space
2. **FAISS Index** - All product image embeddings stored for fast nearest-neighbor search
3. **Similarity Search** - Text embedding compared against all image embeddings via inner product

**Results:**
| Query | Top Matches |
|-------|-------------|
| "red running shoes" | Kipsta Sala Shoes, Nike Tenkay, Puma Sneakerina |
| "black leather formal shoes" | Clarks Men Black, Provogue Men Black, Red Tape |
| "blue denim jeans" | Spykar Men Blue, Deni Yo Slim Fit, Spykar Washed |

## Technology Stack

| Component | Technology |
|-----------|------------|
| Embeddings | CLIP (openai/clip-vit-base-patch32) |
| Vector Search | FAISS (faiss-cpu) |
| Clustering | DBSCAN (scikit-learn) |
| Image Processing | PIL/Pillow, torchvision |
| Deep Learning | PyTorch, Transformers |

## Project Structure

```
product_intelligence/
|-- product_intelligence.ipynb          # Main Kaggle notebook (all 3 tasks)
|-- task1_complementary_recommendations.ipynb  # Detailed Task 1 notebook
|-- task1_step1.py - task1_step4.py    # Task 1 step-by-step scripts
|-- task2_step1.py - task2_step4.py    # Task 2 step-by-step scripts
|-- task3_step1.py - task3_step3.py    # Task 3 step-by-step scripts
|-- recommendation_result.png          # Task 1 visualization
|-- catalog_clusters.png              # Task 2 visualization
|-- search_result.png                 # Task 3 visualization
|-- requirements.txt                  # Python dependencies
```

## Setup & Installation

```bash
pip install -r requirements.txt
```

## Running

### Option 1: Kaggle Notebook
Upload `product_intelligence.ipynb` to Kaggle and run all cells.

### Option 2: Local Scripts
```bash
# Task 1: Complementary Recommendations
python task1_step1.py  # Load dataset
python task1_step2.py  # Encode images with CLIP
python task1_step3.py  # Build FAISS index
python task1_step4.py  # Run recommendations

# Task 2: Unique Catalog
python task2_step1.py  # Load embeddings
python task2_step2.py  # Find optimal DBSCAN parameters
python task2_step3.py  # Run clustering
python task2_step4.py  # Visualize clusters

# Task 3: Reverse Search
python task3_step1.py  # Load CLIP + FAISS
python task3_step2.py  # Text search results
python task3_step3.py  # Full search + visualization
```

## Dataset

Fashion Product Images Small from Kaggle:
https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small

- 44,419 fashion products
- 144 product categories
- 60x80 pixel thumbnail images
- Sample size: 2000 products

## Results

The system successfully demonstrates:

1. **Complementary Recommendations** - Correctly pairs shoes with socks, shirts with trousers, etc.
2. **Catalog Deduplication** - Groups similar products and identifies unique catalog entries
3. **Text-to-Image Search** - Accurately retrieves products matching natural language descriptions

## License

This project is part of the Gen AI Bootcamp Day 2 Challenge.
