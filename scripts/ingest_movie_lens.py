#!/usr/bin/env python3
"""
CineMatch — MovieLens Dataset Ingestion
Processes movies.csv (62k) and ratings.csv (25M).

Outputs:
  data/movie_stats.json        — rating stats for ALL 62k movies (used by API for search)
  data/processed_movies.json   — top 3000 movies with >= 100 ratings (used for SVD training)
  data/processed_ratings.json  — ratings from first 2000 users x catalog movies (for SVD)
"""

import csv
import re
import json
import time
from collections import defaultdict


def clean_title(raw_title):
    """'Shawshank Redemption, The (1994)' -> ('The Shawshank Redemption', 1994)"""
    year = 2000
    year_match = re.search(r'\((\d{4})\)', raw_title)
    if year_match:
        year = int(year_match.group(1))
        title_no_year = re.sub(r'\s*\(\d{4}\).*', '', raw_title).strip()
    else:
        title_no_year = raw_title.strip()

    article = re.match(r'^(.*),\s*(The|A|An)$', title_no_year, re.IGNORECASE)
    if article:
        title_no_year = f"{article.group(2)} {article.group(1)}".strip()

    return title_no_year, year


def main():
    start = time.time()
    print("Starting MovieLens ingestion...")

    # 1. Load movies.csv
    movies = {}
    print("Reading movies.csv...")
    with open('data/movies.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            mid = int(row['movieId'])
            title, year = clean_title(row['title'])
            genres = [g.strip() for g in row['genres'].split('|')
                      if g.strip() and g != '(no genres listed)']
            if not genres:
                genres = ['Unknown']
            movies[mid] = {'id': mid, 'title': title, 'year': year, 'genres': genres}

    print(f"Loaded {len(movies)} movies.")

    # 2. Stream ratings.csv
    print("Streaming ratings.csv (this takes ~30-60 seconds for 25M rows)...")
    vote_count = defaultdict(int)
    rating_sum = defaultdict(float)
    user_ratings_sample = defaultdict(dict)  # first 2000 users

    n = 0
    with open('data/ratings.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            mid = int(row['movieId'])
            uid = int(row['userId'])
            r = float(row['rating'])

            vote_count[mid] += 1
            rating_sum[mid] += r

            if uid <= 2000:
                user_ratings_sample[uid][mid] = r

            n += 1
            if n % 5_000_000 == 0:
                print(f"  {n // 1_000_000}M ratings processed...")

    print(f"Done streaming {n:,} ratings.")

    # 3. Bayesian weighted score for all movies
    # Global average ~3.5, m=100 votes threshold for trust
    C = 3.5
    m = 100

    all_stats = {}
    for mid in movies:
        v = vote_count[mid]
        avg_r = rating_sum[mid] / v if v > 0 else C
        weighted = (v / (v + m)) * avg_r + (m / (v + m)) * C if v > 0 else C
        all_stats[mid] = {
            'rating': round(avg_r, 2),
            'vote_count': v,
            'weighted_score': weighted
        }

    # 4. Save movie_stats.json for ALL movies (used by the API to serve full catalog with stats)
    print("Saving movie_stats.json for all movies...")
    with open('data/movie_stats.json', 'w', encoding='utf-8') as f:
        json.dump(all_stats, f)
    print(f"Saved stats for {len(all_stats)} movies.")

    # 5. Select top 3000 movies with >= 100 ratings for SVD catalog
    # Sort by vote_count (popularity) — best for collaborative filtering.
    # High vote_count means richer rating patterns for SVD to learn from.
    eligible = [mid for mid in movies if vote_count[mid] >= 100]
    eligible.sort(key=lambda mid: vote_count[mid], reverse=True)
    catalog_ids = set(eligible[:3000])

    print(f"Found {len(eligible)} movies with >= 100 ratings. Selecting top 3000.")

    catalog = []
    for mid in eligible[:3000]:
        m_data = movies[mid]
        stats = all_stats[mid]
        catalog.append({
            'id': mid,
            'title': m_data['title'],
            'year': m_data['year'],
            'genres': m_data['genres'],
            'rating': round(stats['rating'], 2),
            'vote_count': stats['vote_count']
        })

    with open('data/processed_movies.json', 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2)
    print(f"Saved {len(catalog)} catalog movies to processed_movies.json.")

    # 6. Save community ratings (first 2000 users x catalog movies only)
    print("Saving community ratings for SVD training...")
    community_ratings = []
    for uid, r_dict in user_ratings_sample.items():
        for mid, rating in r_dict.items():
            if mid in catalog_ids:
                community_ratings.append({
                    'user_id': f'u_{uid}',
                    'movie_id': mid,
                    'rating': rating
                })

    with open('data/processed_ratings.json', 'w', encoding='utf-8') as f:
        json.dump(community_ratings, f)

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.1f}s.")
    print(f"  Catalog: {len(catalog)} movies")
    print(f"  Community ratings: {len(community_ratings)}")
    print(f"  Sample users: {len(user_ratings_sample)}")

    # Quick validation
    jumanji = next((m for m in catalog if 'jumanji' in m['title'].lower()), None)
    print(f"  Jumanji in catalog: {'YES - ' + str(jumanji) if jumanji else 'NO (not enough ratings)'}")


if __name__ == '__main__':
    main()
