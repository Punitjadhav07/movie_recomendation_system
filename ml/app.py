#!/usr/bin/env python3
"""
CineMatch Recommendation API — FastAPI backend.

Run from project root:
  venv/bin/uvicorn ml.app:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
  GET  /health
  GET  /movies?page=1&limit=50&genre=Action&sort=popular
  GET  /movies/search?q=jumanji&limit=20
  GET  /movies/{movie_id}
  POST /ratings                  body: {user_id, movie_id, rating}
  GET  /ratings/{user_id}
  POST /recommend                body: {ratings: {"296": 5.0, ...}, n: 10}
  GET  /recommend/{user_id}?n=10 (for dataset users stored in processed_ratings.json)
  GET  /similar/{movie_id}?n=4
"""

import os
import csv
import json
import re
import numpy as np
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional

# Admin API key — set via environment variable. If unset, admin endpoints are disabled.
ADMIN_API_KEY = os.environ.get("CINEMATCH_ADMIN_KEY", "")

app = FastAPI(title="CineMatch Recommendation API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory state (loaded once at startup) ---
all_movies: List[dict] = []
all_movies_idx: Dict[int, dict] = {}
catalog_movies: List[dict] = []      # SVD-eligible (top 3000)
catalog_idx: Dict[int, dict] = {}
movie_embeddings: Dict[str, list] = {}
latent_sims: Dict[str, list] = {}
model_meta: dict = {}
# ephemeral per-user ratings store (frontend always passes ratings in body anyway)
user_ratings_store: Dict[str, Dict[int, float]] = {}
# dataset users from processed_ratings.json (for GET /recommend/{user_id})
dataset_user_ratings: Dict[str, Dict[int, float]] = {}


def _parse_year(raw_title: str) -> int:
    m = re.search(r'\((\d{4})\)', raw_title)
    return int(m.group(1)) if m else 2000


def _clean_title(raw_title: str) -> str:
    title = re.sub(r'\s*\(\d{4}\).*', '', raw_title).strip()
    m = re.match(r'^(.*),\s*(The|A|An)$', title, re.IGNORECASE)
    if m:
        title = f"{m.group(2)} {m.group(1)}"
    return title


@app.on_event("startup")
def startup():
    global all_movies, all_movies_idx, catalog_movies, catalog_idx
    global movie_embeddings, latent_sims, model_meta, dataset_user_ratings

    # 1. Load SVD catalog (top 3000, has rating stats)
    if os.path.exists("data/processed_movies.json"):
        with open("data/processed_movies.json", encoding="utf-8") as f:
            catalog_movies = json.load(f)
        catalog_idx = {m["id"]: m for m in catalog_movies}
        print(f"Catalog: {len(catalog_movies)} SVD-eligible movies loaded")
    else:
        print("WARNING: data/processed_movies.json not found. Run scripts/ingest_movie_lens.py")

    # 2. Load movie_stats.json for rating stats of all movies
    movie_stats: Dict[int, dict] = {}
    if os.path.exists("data/movie_stats.json"):
        with open("data/movie_stats.json", encoding="utf-8") as f:
            raw = json.load(f)
        movie_stats = {int(k): v for k, v in raw.items()}

    # 3. Load ALL movies from CSV (for complete search coverage)
    if os.path.exists("data/movies.csv"):
        with open("data/movies.csv", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                mid = int(row["movieId"])
                genres = [g.strip() for g in row["genres"].split("|")
                          if g.strip() and g != "(no genres listed)"]
                if not genres:
                    genres = ["Unknown"]
                year = _parse_year(row["title"])
                title = _clean_title(row["title"])
                stats = movie_stats.get(mid, {})
                movie = {
                    "id": mid,
                    "title": title,
                    "year": year,
                    "genres": genres,
                    "rating": round(stats.get("rating", 0.0), 2) if stats.get("rating") else None,
                    "vote_count": stats.get("vote_count"),
                }
                all_movies.append(movie)
                all_movies_idx[mid] = movie
        print(f"All movies: {len(all_movies)} loaded from CSV")
    else:
        print("WARNING: data/movies.csv not found")

    # 4. Load SVD model artifacts
    if os.path.exists("ml/models/movie_latent_embeddings.json"):
        with open("ml/models/movie_latent_embeddings.json", encoding="utf-8") as f:
            movie_embeddings = json.load(f)
        print(f"SVD embeddings: {len(movie_embeddings)} movies, dim={len(next(iter(movie_embeddings.values())))}")
    else:
        print("WARNING: ml/models/movie_latent_embeddings.json not found. Run ml/train_svd.py")

    if os.path.exists("ml/models/latent_similarities.json"):
        with open("ml/models/latent_similarities.json", encoding="utf-8") as f:
            latent_sims = json.load(f)

    if os.path.exists("ml/models/model_metadata.json"):
        with open("ml/models/model_metadata.json", encoding="utf-8") as f:
            model_meta = json.load(f)

    # 5. Load dataset user ratings (for testing with real users)
    if os.path.exists("data/processed_ratings.json"):
        with open("data/processed_ratings.json", encoding="utf-8") as f:
            raw_ratings = json.load(f)
        for r in raw_ratings:
            uid = r["user_id"]
            if uid not in dataset_user_ratings:
                dataset_user_ratings[uid] = {}
            dataset_user_ratings[uid][r["movie_id"]] = r["rating"]
        print(f"Dataset users: {len(dataset_user_ratings)} loaded")

    print("CineMatch API ready.")


# ------------------------------------------------------------------ helpers

def _compute_recommendations(
    user_ratings: Dict[int, float],
    n: int = 10,
    genre_filter: Optional[List[str]] = None
) -> dict:
    """
    Compute Top-N recommendations using SVD latent factor projection.

    Algorithm:
      1. Build user taste vector: u = sum((r - 3.5) * V_j) for each rated movie j
      2. Score each unrated catalog movie i: score = cosine(u, V_i)
      3. Convert score to predicted_rating: 3.5 + score * 1.5  (honest approximation)
      4. Return top N sorted by predicted_rating, excluding already-rated movies.

    Cold start: if no ratings provided, return most-popular catalog movies.
    """
    if not user_ratings or len(movie_embeddings) == 0:
        # Cold start: return most popular (by vote_count)
        popular = sorted(
            catalog_movies,
            key=lambda m: m.get("vote_count") or 0,
            reverse=True
        )
        if genre_filter:
            popular = [m for m in popular if any(g in m["genres"] for g in genre_filter)]
        return {
            "algorithm": "popularity_fallback",
            "is_personalized": False,
            "note": "Rate some movies to get personalized SVD recommendations.",
            "recommendations": popular[:n]
        }

    k = model_meta.get("k", 64)
    u_vec = np.zeros(k, dtype=np.float32)
    rated_count = 0

    for mid, r in user_ratings.items():
        emb = movie_embeddings.get(str(mid))
        if emb is None:
            continue
        u_vec += (r - 3.5) * np.array(emb, dtype=np.float32)
        rated_count += 1

    if rated_count == 0 or np.linalg.norm(u_vec) == 0:
        # All rated movies had no embeddings — fall back
        popular = sorted(catalog_movies, key=lambda m: m.get("vote_count") or 0, reverse=True)
        return {
            "algorithm": "popularity_fallback",
            "is_personalized": False,
            "note": "None of your rated movies are in the SVD catalog. Showing popular picks.",
            "recommendations": popular[:n]
        }

    u_norm = u_vec / np.linalg.norm(u_vec)

    scored = []
    for m in catalog_movies:
        mid = m["id"]
        if mid in user_ratings:
            continue  # exclude already-rated

        emb = movie_embeddings.get(str(mid))
        if emb is None:
            continue

        v = np.array(emb, dtype=np.float32)
        v_norm_val = np.linalg.norm(v)
        if v_norm_val == 0:
            continue

        cosine = float(np.dot(u_norm, v) / v_norm_val)
        # Honest approximation: map cosine [-1,1] to predicted_rating [1,5]
        # We use 3.5 as the center (matches the training mean-centering)
        predicted_rating = round(max(1.0, min(5.0, 3.5 + cosine * 1.5)), 2)

        result = {**m, "predicted_rating": predicted_rating, "latent_score": round(cosine, 4)}

        if genre_filter and not any(g in m["genres"] for g in genre_filter):
            continue

        scored.append(result)

    scored.sort(key=lambda x: x["predicted_rating"], reverse=True)

    return {
        "algorithm": "svd_latent_projection",
        "is_personalized": True,
        "user_rated_in_catalog": rated_count,
        "total_rated": len(user_ratings),
        "recommendations": scored[:n]
    }


# ------------------------------------------------------------------ routes

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "total_movies": len(all_movies),
        "catalog_movies": len(catalog_movies),
        "svd_embeddings": len(movie_embeddings),
        "model": {
            "k": model_meta.get("k"),
            "explained_variance": model_meta.get("explained_variance_ratio"),
            "trained_at": model_meta.get("timestamp")
        }
    }


@app.get("/movies")
def get_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    genre: Optional[str] = None,
    sort: str = Query("popular", enum=["popular", "rating", "year_desc", "year_asc", "title"])
):
    """Returns paginated catalog movies (SVD-eligible top 3000, with rating stats)."""
    movies = catalog_movies[:]

    if genre and genre.lower() not in ("all", ""):
        movies = [m for m in movies if genre in m["genres"]]

    if sort == "popular":
        movies.sort(key=lambda m: m.get("vote_count") or 0, reverse=True)
    elif sort == "rating":
        movies.sort(key=lambda m: m.get("rating") or 0, reverse=True)
    elif sort == "year_desc":
        movies.sort(key=lambda m: m.get("year") or 0, reverse=True)
    elif sort == "year_asc":
        movies.sort(key=lambda m: m.get("year") or 0)
    elif sort == "title":
        movies.sort(key=lambda m: m["title"])

    total = len(movies)
    start = (page - 1) * limit
    end = start + limit
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "movies": movies[start:end]
    }


@app.get("/movies/search")
def search_movies(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Searches ALL 62k movies from movies.csv by title (case-insensitive substring)."""
    q_lower = q.strip().lower()
    if not q_lower:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results = [m for m in all_movies if q_lower in m["title"].lower()]
    results.sort(key=lambda m: (
        not m["title"].lower().startswith(q_lower),
        -(m.get("vote_count") or 0)
    ))
    return {"query": q, "total": len(results), "movies": results[:limit]}


@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    movie = all_movies_idx.get(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")
    return movie


class RatingPayload(BaseModel):
    user_id: str
    movie_id: int
    rating: float  # 0.5 – 5.0


@app.post("/ratings")
def post_rating(payload: RatingPayload):
    if not (0.5 <= payload.rating <= 5.0):
        raise HTTPException(status_code=400, detail="Rating must be between 0.5 and 5.0")
    if payload.movie_id not in all_movies_idx:
        raise HTTPException(status_code=404, detail=f"Movie {payload.movie_id} not found")

    if payload.user_id not in user_ratings_store:
        user_ratings_store[payload.user_id] = {}
    user_ratings_store[payload.user_id][payload.movie_id] = payload.rating

    return {"success": True, "user_id": payload.user_id, "movie_id": payload.movie_id, "rating": payload.rating}


@app.get("/ratings/{user_id}")
def get_ratings(user_id: str):
    ratings = user_ratings_store.get(user_id) or dataset_user_ratings.get(user_id)
    if ratings is None:
        raise HTTPException(status_code=404, detail=f"No ratings found for user '{user_id}'")
    return {"user_id": user_id, "ratings": ratings, "count": len(ratings)}


class RecommendPayload(BaseModel):
    ratings: Dict[str, float]  # movieId (str) -> rating
    n: int = 10
    genre_filter: Optional[List[str]] = None


@app.post("/recommend")
def post_recommend(payload: RecommendPayload):
    """
    Personalized SVD recommendations.
    Pass current user ratings in body. Excludes rated movies from results.
    """
    n = max(1, min(payload.n, 100))
    ratings_int = {int(k): v for k, v in payload.ratings.items()}
    result = _compute_recommendations(ratings_int, n=n, genre_filter=payload.genre_filter)
    return result


@app.get("/recommend/{user_id}")
def get_recommend_user(user_id: str, n: int = Query(10, ge=1, le=100)):
    """
    Recommendations for a known dataset user (u_1 through u_2000).
    Looks up their stored ratings from processed_ratings.json.
    """
    ratings = dataset_user_ratings.get(user_id)
    if not ratings:
        ratings = user_ratings_store.get(user_id)
    if not ratings:
        raise HTTPException(
            status_code=404,
            detail=f"No ratings found for user '{user_id}'. Dataset users are u_1 through u_2000."
        )
    result = _compute_recommendations(ratings, n=n)
    result["user_id"] = user_id
    return result


def _verify_admin(key: str):
    """Verify admin API key. Raises 403 if invalid or not configured."""
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="Admin API key not configured. Set CINEMATCH_ADMIN_KEY env var.")
    if key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin API key.")


@app.get("/admin/stats")
def admin_stats(x_admin_key: str = Header(None)):
    """Real system statistics for the admin dashboard. Requires X-Admin-Key header."""
    _verify_admin(x_admin_key)
    from collections import Counter

    # Rating distribution from dataset
    rating_dist = Counter()
    total_dataset_ratings = 0
    for uid, ratings in dataset_user_ratings.items():
        for mid, r in ratings.items():
            rating_dist[str(r)] += 1
            total_dataset_ratings += 1

    # Ephemeral session ratings
    session_rating_count = sum(len(r) for r in user_ratings_store.values())

    # Genre distribution from catalog
    genre_counts = Counter()
    for m in catalog_movies:
        for g in m.get("genres", []):
            genre_counts[g] += 1

    # Most rated movies (top 20 by vote_count from catalog)
    most_rated = sorted(
        catalog_movies,
        key=lambda m: m.get("vote_count") or 0,
        reverse=True
    )[:20]
    most_rated_list = [
        {"id": m["id"], "title": m["title"], "vote_count": m.get("vote_count"), "rating": m.get("rating")}
        for m in most_rated
    ]

    # Load evaluation metrics if available
    eval_metrics = None
    if os.path.exists("ml/models/evaluation_metrics.json"):
        with open("ml/models/evaluation_metrics.json", encoding="utf-8") as f:
            eval_metrics = json.load(f)

    # Dataset file info
    data_files = {}
    for fname in ["data/movies.csv", "data/ratings.csv", "data/processed_movies.json",
                   "data/processed_ratings.json", "data/movie_stats.json"]:
        data_files[fname] = os.path.exists(fname)

    return {
        "total_movies_csv": len(all_movies),
        "catalog_movies": len(catalog_movies),
        "svd_embeddings": len(movie_embeddings),
        "dataset_users": len(dataset_user_ratings),
        "dataset_ratings": total_dataset_ratings,
        "session_users": len(user_ratings_store),
        "session_ratings": session_rating_count,
        "model": model_meta if model_meta else None,
        "evaluation": eval_metrics,
        "rating_distribution": dict(sorted(rating_dist.items())),
        "genre_distribution": dict(genre_counts.most_common(20)),
        "most_rated_movies": most_rated_list,
        "data_files": data_files,
    }


@app.get("/similar/{movie_id}")
def get_similar(movie_id: int, n: int = Query(4, ge=1, le=20)):
    """Returns nearest neighbors in SVD latent space."""
    sims = latent_sims.get(str(movie_id), [])
    if not sims:
        movie = all_movies_idx.get(movie_id)
        if not movie:
            raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")
        # No SVD embedding — return empty
        return {"movie_id": movie_id, "title": movie["title"], "similar": []}

    results = []
    for item in sims[:n]:
        m = catalog_idx.get(item["movie_id"])
        if m:
            results.append({**m, "latent_similarity": item["similarity"]})

    source = catalog_idx.get(movie_id) or all_movies_idx.get(movie_id)
    return {
        "movie_id": movie_id,
        "title": source["title"] if source else str(movie_id),
        "similar": results
    }
