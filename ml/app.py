#!/usr/bin/env python3
"""
CineMatch Recommendation API — FastAPI backend.

Run from project root:
  venv/bin/uvicorn ml.app:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
  # Auth
  POST /auth/login                body: {username, password}
  POST /auth/register             body: {username, password}
  GET  /auth/verify               header: Authorization: Bearer <token>
  POST /auth/logout               header: Authorization: Bearer <token>

  # Public
  GET  /health
  GET  /movies?page=1&limit=50&genre=Action&sort=popular
  GET  /movies/search?q=jumanji&limit=20
  GET  /movies/{movie_id}
  POST /ratings                   body: {user_id, movie_id, rating}
  GET  /ratings/{user_id}
  POST /recommend                 body: {ratings: {"296": 5.0, ...}, n: 10}
  GET  /recommend/{user_id}?n=10
  GET  /similar/{movie_id}?n=4

  # Admin (requires admin session token)
  GET  /admin/stats
  GET  /admin/users?search=
  GET  /admin/users/{user_id}
  PATCH /admin/users/{user_id}/role  body: {role: "admin"|"user"}
"""

import os
import csv
import json
import re
import secrets
import numpy as np
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional

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

# --- Auth system ---
PRESET_ACCOUNTS = {
    "admin": {"password": "admin@123", "role": "admin", "name": "System Administrator"},
    "user1": {"password": "password@123", "role": "user", "name": "User 1"},
}
USERS_FILE = "data/app_users.json"
app_users: Dict[str, dict] = {}
active_sessions: Dict[str, dict] = {}


def _load_app_users():
    """Load registered app users from JSON file. Presets always exist."""
    global app_users
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, encoding="utf-8") as f:
                app_users = json.load(f)
        except (json.JSONDecodeError, IOError):
            app_users = {}
    for uname, data in PRESET_ACCOUNTS.items():
        if uname not in app_users:
            app_users[uname] = {**data, "created_at": "preset"}


def _save_app_users():
    """Persist app users to JSON file."""
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(app_users, f, indent=2)
    except IOError:
        pass


def _require_admin(authorization: Optional[str]) -> dict:
    """Verify the request has a valid admin session token. Returns session dict."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return session


def _user_id_for(username: str) -> str:
    return f"preset_{username}" if username in PRESET_ACCOUNTS else f"user_{username}"


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

    # 6. Load app users
    _load_app_users()
    print(f"App users: {len(app_users)} loaded")

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
            continue

        emb = movie_embeddings.get(str(mid))
        if emb is None:
            continue

        v = np.array(emb, dtype=np.float32)
        v_norm_val = np.linalg.norm(v)
        if v_norm_val == 0:
            continue

        cosine = float(np.dot(u_norm, v) / v_norm_val)
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


# ------------------------------------------------------------------ auth routes

class LoginPayload(BaseModel):
    username: str
    password: str


class RegisterPayload(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
def auth_login(payload: LoginPayload):
    """Authenticate with username/password. Returns session token and user info."""
    uname = payload.username.strip().lower()
    account = app_users.get(uname)
    if not account or account["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_hex(32)
    user_id = _user_id_for(uname)
    session = {
        "user_id": user_id,
        "username": uname,
        "role": account["role"],
        "name": account.get("name", uname),
    }
    active_sessions[token] = session
    return {"token": token, **session}


@app.post("/auth/register")
def auth_register(payload: RegisterPayload):
    """Register a new user account. Always assigns role=user."""
    uname = payload.username.strip().lower()
    if uname in app_users:
        raise HTTPException(status_code=409, detail="Username already exists")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not uname or len(uname) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")

    app_users[uname] = {
        "password": payload.password,
        "role": "user",
        "name": uname,
        "created_at": datetime.now().isoformat(),
    }
    _save_app_users()

    token = secrets.token_hex(32)
    user_id = _user_id_for(uname)
    session = {
        "user_id": user_id,
        "username": uname,
        "role": "user",
        "name": uname,
    }
    active_sessions[token] = session
    return {"token": token, **session}


@app.get("/auth/verify")
def auth_verify(authorization: str = Header(None)):
    """Check if a session token is still valid. Returns session info."""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return session


@app.post("/auth/logout")
def auth_logout(authorization: str = Header(None)):
    """Invalidate a session token."""
    if authorization:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        active_sessions.pop(token, None)
    return {"success": True}


# ------------------------------------------------------------------ public routes

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
    rating: float  # 0.5 - 5.0


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


@app.get("/similar/{movie_id}")
def get_similar(movie_id: int, n: int = Query(4, ge=1, le=20)):
    """Returns nearest neighbors in SVD latent space."""
    sims = latent_sims.get(str(movie_id), [])
    if not sims:
        movie = all_movies_idx.get(movie_id)
        if not movie:
            raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")
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


# ------------------------------------------------------------------ admin routes

@app.get("/admin/stats")
def admin_stats(authorization: str = Header(None)):
    """Real system statistics for the admin dashboard. Requires admin session."""
    _require_admin(authorization)
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

    # App user stats
    admin_count = sum(1 for d in app_users.values() if d["role"] == "admin")

    return {
        "total_movies_csv": len(all_movies),
        "catalog_movies": len(catalog_movies),
        "svd_embeddings": len(movie_embeddings),
        "dataset_users": len(dataset_user_ratings),
        "dataset_ratings": total_dataset_ratings,
        "session_users": len(user_ratings_store),
        "session_ratings": session_rating_count,
        "app_users": len(app_users),
        "admin_users": admin_count,
        "model": model_meta if model_meta else None,
        "evaluation": eval_metrics,
        "rating_distribution": dict(sorted(rating_dist.items())),
        "genre_distribution": dict(genre_counts.most_common(20)),
        "most_rated_movies": most_rated_list,
        "data_files": data_files,
    }


@app.get("/admin/users")
def admin_get_users(
    authorization: str = Header(None),
    search: str = Query(""),
):
    """List app users and session users. Requires admin session."""
    _require_admin(authorization)

    search_lower = search.strip().lower()
    users = []

    # App users (preset + registered)
    for uname, data in app_users.items():
        uid = _user_id_for(uname)
        ratings = user_ratings_store.get(uid, {})
        user_info = {
            "user_id": uid,
            "username": uname,
            "role": data["role"],
            "name": data.get("name", uname),
            "created_at": data.get("created_at"),
            "rating_count": len(ratings),
            "avg_rating": round(sum(ratings.values()) / len(ratings), 2) if ratings else None,
            "source": "preset" if uname in PRESET_ACCOUNTS else "registered",
        }
        if search_lower:
            if search_lower not in uname.lower() and search_lower not in (data.get("name", "")).lower() and search_lower not in uid.lower():
                continue
        users.append(user_info)

    # Session-only users (rated but not registered)
    for uid, ratings in user_ratings_store.items():
        if any(u["user_id"] == uid for u in users):
            continue
        user_info = {
            "user_id": uid,
            "username": uid,
            "role": "user",
            "name": uid,
            "created_at": None,
            "rating_count": len(ratings),
            "avg_rating": round(sum(ratings.values()) / len(ratings), 2) if ratings else None,
            "source": "session",
        }
        if search_lower and search_lower not in uid.lower():
            continue
        users.append(user_info)

    # Stats
    total_app = len(app_users)
    admin_count = sum(1 for d in app_users.values() if d["role"] == "admin")
    users_with_ratings = sum(1 for u in users if u["rating_count"] > 0)

    return {
        "users": users,
        "stats": {
            "total_app_users": total_app,
            "admin_users": admin_count,
            "normal_users": total_app - admin_count,
            "session_users": len(user_ratings_store),
            "dataset_users": len(dataset_user_ratings),
            "users_with_ratings": users_with_ratings,
            "users_without_ratings": len(users) - users_with_ratings,
        }
    }


@app.get("/admin/users/{user_id}")
def admin_get_user_detail(user_id: str, authorization: str = Header(None)):
    """Get detailed user info including rating history. Requires admin session."""
    _require_admin(authorization)

    # Find user account info
    uname = user_id.replace("preset_", "").replace("user_", "")
    account = app_users.get(uname)

    # Get ratings (session first, then dataset)
    ratings = user_ratings_store.get(user_id, {})
    if not ratings:
        ratings = dataset_user_ratings.get(user_id, {})

    if not account and not ratings:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")

    # Build rating history with movie titles
    rating_history = []
    for mid, r in ratings.items():
        mid_int = int(mid) if isinstance(mid, str) else mid
        movie = all_movies_idx.get(mid_int) or catalog_idx.get(mid_int)
        rating_history.append({
            "movie_id": mid_int,
            "title": movie["title"] if movie else f"Movie #{mid_int}",
            "rating": r,
            "genres": movie.get("genres", []) if movie else [],
        })
    rating_history.sort(key=lambda x: x["rating"], reverse=True)

    source = "dataset"
    if account:
        source = "preset" if uname in PRESET_ACCOUNTS else "registered"
    elif user_id in user_ratings_store:
        source = "session"

    return {
        "user_id": user_id,
        "username": uname if account else user_id,
        "role": account["role"] if account else "user",
        "name": account.get("name", uname) if account else user_id,
        "created_at": account.get("created_at") if account else None,
        "source": source,
        "rating_count": len(ratings),
        "avg_rating": round(sum(ratings.values()) / len(ratings), 2) if ratings else None,
        "ratings": rating_history,
    }


class RoleChangePayload(BaseModel):
    role: str


@app.patch("/admin/users/{user_id}/role")
def admin_change_role(user_id: str, payload: RoleChangePayload, authorization: str = Header(None)):
    """Change a user's role. Only works for app users (preset/registered). Requires admin session."""
    _require_admin(authorization)

    if payload.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")

    uname = user_id.replace("preset_", "").replace("user_", "")
    if uname not in app_users:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found in app accounts")

    app_users[uname]["role"] = payload.role
    _save_app_users()

    # Update any active sessions for this user
    for token, session in active_sessions.items():
        if session["user_id"] == user_id:
            session["role"] = payload.role

    return {"success": True, "user_id": user_id, "new_role": payload.role}
