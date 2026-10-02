#!/usr/bin/env python3
"""
CineMatch SVD Model Evaluation — run from project root.

Computes:
  - RMSE and MAE  (rating prediction quality)
  - Precision@10, Recall@10 (Top-N recommendation quality)

Usage:
  venv/bin/python ml/evaluate_model.py
"""

import json
import random
import numpy as np
from collections import defaultdict


def load_data():
    with open("data/processed_movies.json") as f:
        movies = json.load(f)
    movie_id_set = {m["id"] for m in movies}

    with open("data/processed_ratings.json") as f:
        ratings = json.load(f)

    with open("ml/models/movie_latent_embeddings.json") as f:
        embeddings = json.load(f)

    with open("ml/models/model_metadata.json") as f:
        meta = json.load(f)

    return movies, movie_id_set, ratings, embeddings, meta


def project_user_vector(user_ratings_dict, embeddings, k):
    """Build user latent vector from rated movies."""
    u = np.zeros(k, dtype=np.float32)
    count = 0
    for mid, r in user_ratings_dict.items():
        emb = embeddings.get(str(mid))
        if emb is None:
            continue
        u += (r - 3.5) * np.array(emb, dtype=np.float32)
        count += 1
    return u, count


def predict_rating(u_vec, movie_emb):
    """Cosine-based predicted rating."""
    u_norm = np.linalg.norm(u_vec)
    v_norm = np.linalg.norm(movie_emb)
    if u_norm == 0 or v_norm == 0:
        return 3.5
    cosine = float(np.dot(u_vec, movie_emb) / (u_norm * v_norm))
    return round(max(1.0, min(5.0, 3.5 + cosine * 1.5)), 2)


def main():
    print("Loading data...")
    movies, movie_id_set, ratings, embeddings, meta = load_data()
    k = meta["k"]
    print(f"  {len(movies)} catalog movies, {len(ratings)} ratings, k={k}")

    # Group ratings by user
    user_ratings = defaultdict(dict)
    for r in ratings:
        user_ratings[r["user_id"]][r["movie_id"]] = r["rating"]

    users = list(user_ratings.keys())
    print(f"  {len(users)} users in dataset")

    # --- RMSE / MAE via leave-one-out ---
    print("\nComputing RMSE/MAE (leave-one-out on 200 random users)...")
    rmse_errors = []
    mae_errors = []
    n_eval_users = min(200, len(users))
    sample_users = random.sample(users, n_eval_users)

    for uid in sample_users:
        r_dict = user_ratings[uid]
        if len(r_dict) < 4:
            continue
        # Hold out one rating
        test_mid = random.choice(list(r_dict.keys()))
        test_rating = r_dict[test_mid]
        train = {mid: r for mid, r in r_dict.items() if mid != test_mid}

        u_vec, count = project_user_vector(train, embeddings, k)
        if count == 0:
            continue

        emb = embeddings.get(str(test_mid))
        if emb is None:
            continue

        pred = predict_rating(u_vec, np.array(emb, dtype=np.float32))
        err = pred - test_rating
        rmse_errors.append(err ** 2)
        mae_errors.append(abs(err))

    rmse = np.sqrt(np.mean(rmse_errors)) if rmse_errors else float('nan')
    mae = np.mean(mae_errors) if mae_errors else float('nan')
    print(f"  Evaluated {len(rmse_errors)} hold-out pairs")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  MAE:  {mae:.4f}")

    # --- Precision@10 / Recall@10 ---
    # "Relevant" = rating >= 4.0 in held-out test set
    print("\nComputing Precision@10, Recall@10 (100 users, 20% test split)...")
    prec_list, rec_list = [], []
    n_topn_users = min(100, len(users))
    topn_users = random.sample(users, n_topn_users)

    for uid in topn_users:
        r_dict = user_ratings[uid]
        if len(r_dict) < 10:
            continue

        all_items = list(r_dict.keys())
        random.shuffle(all_items)
        split = max(1, len(all_items) // 5)
        test_items = set(all_items[:split])
        train_items = all_items[split:]
        train = {mid: r_dict[mid] for mid in train_items}

        u_vec, count = project_user_vector(train, embeddings, k)
        if count == 0:
            continue

        u_norm = np.linalg.norm(u_vec)
        if u_norm == 0:
            continue
        u_unit = u_vec / u_norm

        # Score all catalog movies not in training
        scored = []
        for mid_str, emb in embeddings.items():
            mid = int(mid_str)
            if mid in train:
                continue
            v = np.array(emb, dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                continue
            score = float(np.dot(u_unit, v) / v_norm)
            scored.append((mid, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        top10_ids = {mid for mid, _ in scored[:10]}

        # Relevant items: test items with actual rating >= 4.0
        relevant = {mid for mid in test_items if r_dict.get(mid, 0) >= 4.0}
        if not relevant:
            continue

        hits = top10_ids & relevant
        prec = len(hits) / 10
        rec = len(hits) / len(relevant)
        prec_list.append(prec)
        rec_list.append(rec)

    prec10 = np.mean(prec_list) if prec_list else float('nan')
    rec10 = np.mean(rec_list) if rec_list else float('nan')
    print(f"  Evaluated {len(prec_list)} users")
    print(f"  Precision@10: {prec10:.4f}")
    print(f"  Recall@10:    {rec10:.4f}")

    print("\n--- Summary ---")
    print(f"  RMSE:          {rmse:.4f}  (lower is better; random baseline ~1.1)")
    print(f"  MAE:           {mae:.4f}  (lower is better)")
    print(f"  Precision@10:  {prec10:.4f} (fraction of top-10 that are relevant)")
    print(f"  Recall@10:     {rec10:.4f} (fraction of relevant found in top-10)")
    print("\nNote: Predicted rating uses cosine similarity mapped to 1-5 scale.")
    print("RMSE/MAE measure point prediction accuracy; Precision/Recall measure ranking quality.")


if __name__ == "__main__":
    random.seed(42)
    np.random.seed(42)
    main()
