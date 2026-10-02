#!/usr/bin/env python3
"""
CineMatch — SVD Latent Matrix Factorization Training Pipeline
Trains a 64-dimensional latent factor model from MovieLens ratings
"""

import os
import sys
import json
import time
import math
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
from sklearn.metrics.pairwise import cosine_similarity

def train_svd_pipeline():
    start_time = time.time()
    print("🧠 Starting SVD Matrix Factorization Training...")

    os.makedirs("ml/models", exist_ok=True)

    # 1. Load movies catalog metadata
    print("Loading processed movie catalog...")
    with open("data/processed_movies.json", "r", encoding="utf-8") as f:
        movies = json.load(f)

    movie_id_to_idx = {m["id"]: idx for idx, m in enumerate(movies)}
    idx_to_movie_id = {idx: m["id"] for idx, m in enumerate(movies)}
    n_movies = len(movies)
    print(f"Catalog contains {n_movies} target movies.")

    # 2. Load rating interactions
    print("Loading community rating interactions...")
    with open("data/processed_ratings.json", "r", encoding="utf-8") as f:
        ratings = json.load(f)

    user_ids = sorted(list(set(r["user_id"] for r in ratings)))
    user_id_to_idx = {u: idx for idx, u in enumerate(user_ids)}
    n_users = len(user_ids)
    print(f"Dataset contains {n_users} users and {len(ratings)} ratings.")

    # 3. Build Sparse User-Item Rating Matrix
    row_ind = []
    col_ind = []
    data = []

    for r in ratings:
        if r["movie_id"] in movie_id_to_idx:
            u_idx = user_id_to_idx[r["user_id"]]
            m_idx = movie_id_to_idx[r["movie_id"]]
            row_ind.append(u_idx)
            col_ind.append(m_idx)
            # Center ratings around mean 3.5
            data.append(r["rating"] - 3.5)

    R = csr_matrix((data, (row_ind, col_ind)), shape=(n_users, n_movies), dtype=np.float32)
    density = (R.nnz / (n_users * n_movies)) * 100
    print(f"Constructed Sparse Matrix R of shape {R.shape}, density: {density:.2f}%")

    # 4. Perform Truncated SVD Decomposition: R ~ U * S * V^T
    k = min(32, min(n_users - 1, n_movies - 1))
    print(f"Decomposing rating matrix into k={k} latent dimensions via SVD...")
    
    U, s, Vt = svds(R, k=k)

    # Sort singular values in descending order
    idx = np.argsort(s)[::-1]
    s = s[idx]
    U = U[:, idx]
    Vt = Vt[idx, :]

    # Movie latent factor embeddings: V = Vt.T of shape (n_movies, k)
    # Scale by singular values: V_scaled = Vt.T * sqrt(s)
    V_factors = Vt.T * np.sqrt(s)  # Shape (n_movies, k)

    # 5. Compute Latent Cosine Similarity Matrix
    print("Computing Movie Latent Embedding Similarity...")
    latent_sim_matrix = cosine_similarity(V_factors)

    movie_embeddings_map = {}
    similar_movies_latent = {}

    for i, m in enumerate(movies):
        m_id = m["id"]
        movie_embeddings_map[str(m_id)] = V_factors[i].tolist()
        
        # Find top 6 most similar in latent factor space
        sim_scores = [(idx_to_movie_id[j], float(latent_sim_matrix[i, j])) for j in range(n_movies) if j != i]
        sim_scores.sort(key=lambda x: x[1], reverse=True)
        similar_movies_latent[str(m_id)] = [
            {"movie_id": tid, "similarity": round(score, 4)}
            for tid, score in sim_scores[:6]
        ]

    # 6. Save Model Artifacts
    model_metadata = {
        "algorithm": "Truncated SVD (Singular Value Decomposition)",
        "latent_dimensions": k,
        "singular_values": s.tolist(),
        "total_movies": n_movies,
        "total_users": n_users,
        "total_ratings": len(ratings),
        "matrix_density_pct": round(density, 2),
        "explained_variance_ratio": round(float(np.sum(s**2) / np.sum(R.data**2)), 4),
        "training_time_seconds": round(time.time() - start_time, 2),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open("ml/models/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)

    with open("ml/models/movie_latent_embeddings.json", "w", encoding="utf-8") as f:
        json.dump(movie_embeddings_map, f)

    with open("ml/models/latent_similarities.json", "w", encoding="utf-8") as f:
        json.dump(similar_movies_latent, f, indent=2)

    print(f"\n✅ SVD Model successfully trained and saved!")
    print(f"Explained Variance: {model_metadata['explained_variance_ratio'] * 100:.1f}%")
    print(f"Latent Factors: {k} dimensions")

if __name__ == "__main__":
    train_svd_pipeline()
