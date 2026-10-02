#!/usr/bin/env python3
"""
CineMatch — SVD Latent Matrix Factorization Training
Trains on the top 3000 most-rated movies x 2000 community users.
Saves:
  ml/models/movie_latent_embeddings.json  — per-movie 64-dim latent vectors
  ml/models/latent_similarities.json      — top-6 nearest neighbors per movie
  ml/models/model_metadata.json           — training stats
"""

import os
import json
import time
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
from sklearn.metrics.pairwise import cosine_similarity

os.makedirs("ml/models", exist_ok=True)


def train():
    t0 = time.time()
    print("Loading processed catalog...")
    with open("data/processed_movies.json", encoding="utf-8") as f:
        movies = json.load(f)
    n_movies = len(movies)
    movie_id_to_idx = {m["id"]: i for i, m in enumerate(movies)}
    idx_to_movie_id = {i: m["id"] for i, m in enumerate(movies)}
    print(f"  {n_movies} catalog movies")

    print("Loading community ratings...")
    with open("data/processed_ratings.json", encoding="utf-8") as f:
        ratings = json.load(f)
    user_ids = sorted({r["user_id"] for r in ratings})
    user_id_to_idx = {u: i for i, u in enumerate(user_ids)}
    n_users = len(user_ids)
    print(f"  {n_users} users, {len(ratings)} ratings")

    # Build sparse user-item matrix (mean-centered at 3.5)
    rows, cols, vals = [], [], []
    skipped = 0
    for r in ratings:
        mid = r["movie_id"]
        if mid not in movie_id_to_idx:
            skipped += 1
            continue
        rows.append(user_id_to_idx[r["user_id"]])
        cols.append(movie_id_to_idx[mid])
        vals.append(r["rating"] - 3.5)

    if skipped:
        print(f"  Skipped {skipped} ratings (movie not in catalog)")

    R = csr_matrix((vals, (rows, cols)), shape=(n_users, n_movies), dtype=np.float32)
    density = R.nnz / (n_users * n_movies) * 100
    print(f"  Sparse matrix {R.shape}, density {density:.3f}%")

    # Truncated SVD: R ≈ U * diag(s) * Vt
    k = min(64, min(n_users - 1, n_movies - 1))
    print(f"Running SVD with k={k} latent factors...")
    U, s, Vt = svds(R, k=k)

    # Sort singular values descending
    order = np.argsort(s)[::-1]
    s, U, Vt = s[order], U[:, order], Vt[order, :]

    # Movie latent vectors: V_scaled[i] = Vt[i] * sqrt(s)
    # These encode what each movie "is about" in latent space.
    V = Vt.T * np.sqrt(s)  # shape (n_movies, k)

    print("Computing item-item latent similarities...")
    sim_matrix = cosine_similarity(V)  # shape (n_movies, n_movies)

    movie_embeddings = {}
    latent_sims = {}
    for i, m in enumerate(movies):
        mid_str = str(m["id"])
        movie_embeddings[mid_str] = V[i].tolist()

        sim_scores = [
            {"movie_id": idx_to_movie_id[j], "similarity": round(float(sim_matrix[i, j]), 4)}
            for j in range(n_movies) if j != i
        ]
        sim_scores.sort(key=lambda x: x["similarity"], reverse=True)
        latent_sims[mid_str] = sim_scores[:6]

    explained = float(np.sum(s ** 2) / np.sum(R.data ** 2)) if R.nnz > 0 else 0.0
    metadata = {
        "algorithm": "Truncated SVD",
        "k": k,
        "n_movies": n_movies,
        "n_users": n_users,
        "n_ratings": len(ratings),
        "matrix_density_pct": round(density, 3),
        "explained_variance_ratio": round(explained, 4),
        "singular_values_top5": s[:5].tolist(),
        "training_time_s": round(time.time() - t0, 2),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open("ml/models/movie_latent_embeddings.json", "w") as f:
        json.dump(movie_embeddings, f)
    with open("ml/models/latent_similarities.json", "w") as f:
        json.dump(latent_sims, f, indent=2)
    with open("ml/models/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSVD training complete in {metadata['training_time_s']}s")
    print(f"  k={k} latent factors")
    print(f"  Explained variance: {explained*100:.1f}%")
    print(f"  Embeddings saved for {len(movie_embeddings)} movies")


if __name__ == "__main__":
    train()
