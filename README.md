# AI Product Intelligence System

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch">
  <img src="https://img.shields.io/badge/CLIP-OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="CLIP">
  <img src="https://img.shields.io/badge/FAISS-Facebook-1877F2?style=for-the-badge" alt="FAISS">
  <img src="https://img.shields.io/badge/DBSCAN-scikit--learn-F7931E?style=for-the-badge" alt="DBSCAN">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <strong>End-to-end product intelligence pipeline for fashion e-commerce — covering complementary recommendations, catalog deduplication, and natural language visual search.</strong>
</p>

---

## Overview

An AI-driven product intelligence system built on **OpenAI's CLIP** (Contrastive Language–Image Pre-training) that understands fashion products from images and enables three core e-commerce capabilities:

| Capability | Description |
|:-----------|:------------|
| **Complementary Recommendations** | Suggest visually and categorically compatible products (e.g., shirt → matching trousers, shoes, belt) |
| **Catalog Deduplication** | Identify and cluster near-duplicate product listings using unsupervised learning |
| **Reverse Visual Search** | Retrieve products from free-text natural language queries via CLIP's shared text–image embedding space |

All three tasks share a unified **CLIP ViT-B/32** embedding space and **FAISS** vector index, demonstrating a coherent, reusable architecture.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLIP ViT-B/32 (512-dim)                            │
│  ┌───────────────┐                 ┌───────────────┐                   │
│  │ Image Encoder │                 │ Text Encoder  │                   │
│  │  → 512-dim    │                 │  → 512-dim    │                   │
│  └───────┬───────┘                 └───────┬───────┘                   │
│          └─────────────┬───────────────────┘                           │
└────────────────────────┼───────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   FAISS IndexFlatIP    │
            │  (cosine similarity)   │
            └────────────┬───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │   Task 1:   │ │   Task 2:   │ │   Task 3:   │
  │ Complement  │ │   Unique    │ │   Reverse   │
  │ Recommend.  │ │   Catalog   │ │   Search    │
  └─────────────┘ └─────────────┘ └─────────────┘
         │               │               │
         ▼               ▼               ▼
   Category Rules   DBSCAN Cluster   Text-to-Image
   + Visual Rank    on Embeddings    Retrieval
```

---

## Task 1 — Smart Complementary Recommendation Engine

### Problem

E-commerce platforms need to recommend products that are commonly purchased together — not just visually similar items. Given a pair of running shoes, the system should suggest matching socks, track pants, T-shirts, shorts, and watches.

### Approach

A hybrid method combining **domain-curated category rules** with **CLIP visual similarity**:

1. **Complement Map** — Curated dictionary mapping 27 product categories to their complementary categories
2. **Cross-Category Similarity** — CLIP embeddings rank candidates within each complementary category
3. **Visual Re-ranking** — Top matches selected by cosine similarity score

### Pipeline

```bash
python task1_step1.py  # Load dataset & inspect metadata
python task1_step2.py  # Load CLIP, encode 2000 product images
python task1_step3.py  # Build FAISS index + complement rules
python task1_step4.py  # Run recommendations → recommendation_result.png
```

### Results

| Input Product | Top Recommendations |
|:--------------|:--------------------|
| Running Shoe | Sports Shoes, Socks, Track Pants, T-Shirts |
| Formal Shirt | Trousers, Formal Shoes, Belts, Watches |
| Jeans | T-Shirts, Casual Shoes, Sneakers, Jackets |

> The category-constrained + visual-re-rank hybrid produces recommendations that are both stylistically valid and visually coherent.

---

## Task 2 — Unique Product Catalog Creation

### Problem

Large marketplaces contain duplicate and near-duplicate products uploaded by different sellers, degrading catalog quality and user experience.

### Approach

**DBSCAN clustering** on CLIP image embeddings to group visually similar products:

1. **K-Distance Elbow Analysis** — Determine optimal neighborhood radius (`eps`) for density-based clustering
2. **DBSCAN Sweep** — Evaluate `eps` values from 0.10 to 0.22 (cosine distance, `min_samples=3`)
3. **Cluster Visualization** — Sample products from each cluster for visual inspection

### Pipeline

```bash
python task2_step1.py  # Load Task-1 embeddings & metadata
python task2_step2.py  # K-distance elbow analysis → distance_curve.png
python task2_step3.py  # DBSCAN eps sweep, fit final model
python task2_step4.py  # Visualize clusters → catalog_clusters.png
```

### Results

| Metric | Value |
|:-------|:------|
| Input Products | 2,000 |
| Clustering Algorithm | DBSCAN (cosine distance) |
| Noise Handling | Points with no close neighbors isolated |

> DBSCAN with cosine distance groups products at a category level — a defensible first step toward catalog de-duplication, with tightening via maximum-cluster-size constraints and medoid extraction as the next tuning step.

---

## Task 3 — Reverse Product Search (Text-to-Image)

### Problem

Users want to search products using natural language descriptions (e.g., "blue denim jeans") instead of uploading reference images.

### Approach

**CLIP text-to-image retrieval** powered by FAISS indexing:

1. **Text Encoding** — User query encoded via CLIP's `get_text_features` into the shared 512-dim space
2. **FAISS Search** — `IndexFlatIP` retrieves top-k nearest product images by cosine similarity
3. **Result Ranking** — Products returned with rank, category, color, and similarity score

### Pipeline

```bash
python task3_step1.py  # Load CLIP model, embeddings, FAISS index
python task3_step2.py  # Run text queries → console output
python task3_step3.py  # Full search + visualization → search_result.png
```

### Results

| Query | Top Matches |
|:------|:------------|
| "red running shoes" | Kipsta Sala Shoes, Nike Tenkay, Puma Sneakerina |
| "black leather formal shoes" | Clarks Men Black, Provogue Men Black, Red Tape |
| "blue denim jeans" | Spykar Men Blue, Deni Yo Slim Fit, Spykar Washed |

> Similarity scores cluster in the 0.2–0.3 range, consistent with CLIP ViT-B/32 behavior on small, low-resolution catalog thumbnails.

---

## Technology Stack

| Layer | Technology |
|:------|:-----------|
| **Embedding Model** | CLIP ViT-B/32 (`openai/clip-vit-base-patch32`) |
| **Vector Search** | FAISS IndexFlatIP (`faiss-cpu`) |
| **Clustering** | DBSCAN (`scikit-learn`, cosine distance) |
| **Deep Learning** | PyTorch, Hugging Face Transformers |
| **Image Processing** | Pillow, torchvision |
| **Data Handling** | pandas, NumPy |
| **Visualization** | Matplotlib |

---

## Project Structure

```
ai-product-intelligence/
├── product_intelligence.ipynb              # Consolidated notebook (all tasks)
├── task1_complementary_recommendations.ipynb  # Task 1 detailed notebook
├── task1_step1.py ─ task1_step4.py         # Task 1 pipeline scripts
├── task2_step1.py ─ task2_step4.py         # Task 2 pipeline scripts
├── task3_step1.py ─ task3_step3.py         # Task 3 pipeline scripts
├── recommendation_result.png              # Task 1 visualization
├── catalog_clusters.png                   # Task 2 visualization
├── search_result.png                      # Task 3 visualization
└── requirements.txt                       # Python dependencies
```

---

## Getting Started

### Prerequisites

- Python 3.x
- CUDA-compatible GPU (recommended for CLIP inference)

### Installation

```bash
git clone https://github.com/parhavigv/ai-product-intelligence.git
cd ai-product-intelligence
pip install -r requirements.txt
```

### Running

**Option 1 — Consolidated Notebook**

Open `product_intelligence.ipynb` in Jupyter/Kaggle and run all cells.

**Option 2 — Individual Scripts**

```bash
# Task 1: Complementary Recommendations
python task1_step1.py  # Load dataset
python task1_step2.py  # Encode images with CLIP
python task1_step3.py  # Build FAISS index
python task1_step4.py  # Generate recommendations

# Task 2: Unique Catalog
python task2_step1.py  # Load embeddings
python task2_step2.py  # K-distance elbow analysis
python task2_step3.py  # Run DBSCAN clustering
python task2_step4.py  # Visualize clusters

# Task 3: Reverse Search
python task3_step1.py  # Initialize CLIP + FAISS
python task3_step2.py  # Execute text search
python task3_step3.py  # Full search + visualization
```

---

## Dataset

**Fashion Product Images (Small)** — [Kaggle](https://www.kaggle.com/datasets/paramaggarwal/fashion-product-images-small)

| Property | Detail |
|:---------|:-------|
| Total Products | 44,419 |
| Categories | 27 product types |
| Sample Size | 2,000 products (`random_state=42`) |
| Image Format | 60 × 80 px thumbnails |
| Metadata | `styles.csv` (product attributes) |

---

## Results Summary

| Task | Method | Key Outcome |
|:-----|:-------|:------------|
| Complementary Recommendations | Category Rules + CLIP Similarity | Stylistically valid, visually coherent product pairing |
| Catalog Deduplication | DBSCAN on CLIP Embeddings | Visual grouping of similar products for de-duplication |
| Reverse Visual Search | CLIP Text Encoding + FAISS | Accurate text-to-image retrieval from catalog |

---

## Future Improvements

- **FAISS-based recommendation** — Query FAISS index directly in Task 1 for consistency with Tasks 2 and 3
- **Tighter clustering** — Maximum-cluster-size constraints + medoid extraction for true near-duplicate detection
- **Score normalization** — Per-query normalization for clearer differentiation of closely related results
- **HNSW indexing** — Approximate nearest neighbor search for larger catalogs
- **Streaming database backend** — Real-time catalog updates
- **LLM-based style coach** — Conversational product recommendation

---

## Author

**Parhavi G.V** — [GitHub](https://github.com/parhavigv)

B.Tech — Artificial Intelligence & Machine Learning  
Dayananda Sagar University, Bengaluru

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
