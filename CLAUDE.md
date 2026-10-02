# CineMatch — Project Reference

## What this is
A movie recommendation web app called **CineMatch** built with React 19 + Vite. It uses a hybrid Collaborative Filtering engine (User-User + Item-Item CF) implemented entirely in the browser. Supabase is optional — the app works fully offline with local mock data.

## Stack
- **React 19** (no router — single-page, tab-based navigation)
- **Vite 8** with `@vitejs/plugin-react`
- **Supabase JS v2** — optional backend (movies table, ratings table, user_profiles)
- **lucide-react** — icons
- **canvas-confetti** — celebration effects
- **oxlint** — linter (`npm run lint`)
- **No CSS framework** — custom CSS in `src/index.css` and `src/App.css`

## Dev commands
```
npm run dev      # start dev server
npm run build    # production build
npm run lint     # oxlint
npm run preview  # preview production build
```

## Project structure
```
src/
  main.jsx                      # React root, wraps app in <AuthProvider>
  App.jsx                       # Root component — all main state lives here
  App.css / index.css           # All styles (dark theme, CSS variables)
  context/
    AuthContext.jsx             # Auth state + login/signup/logout logic
  pages/
    AuthPage.jsx                # Login/Signup UI (shown when !user)
    GenreSelection.jsx          # Onboarding modal — shown once per new user
  components/
    Navbar.jsx                  # Top nav with tabs, search, action buttons
    HeroBanner.jsx              # Hero spotlight for top recommended movie
    MovieCard.jsx               # Individual movie card with inline star rating
    FilterBar.jsx               # Genre toggle + sort + min-rating controls
    MovieDetailsModal.jsx       # Full movie details + similar movies
    TasteProfileModal.jsx       # User taste analytics (archetype, genre dist)
    QuickRateDrawer.jsx         # Slide-in drawer for rapid movie calibration
    SupabaseConfigModal.jsx     # UI to enter/update Supabase URL + anon key
    MLInsightsModal.jsx         # Explains the CF algorithm to the user
  services/
    supabaseClient.js           # Creates/caches Supabase client; reads from localStorage or VITE_ env
    supabaseService.js          # fetchMoviesFromDb, syncRatingToSupabase, fetchSimilarMoviesFromDb
    recommendationEngine.js     # All ML logic (cosine similarity, CF scoring, taste profile)
  data/
    mockMovies.js               # INITIAL_MOVIES array + COMMUNITY_USERS mock matrix + GENRES list
  assets/
    hero.png
```

## Auth system
- **Local-only auth** by default (no Supabase required)
- Hardcoded preset accounts in `AuthContext.jsx`:
  - `user1 / password@123` (role: user)
  - `admin / admin@123` (role: admin)
- New accounts registered via signup are stored in `localStorage` as `cinematch_custom_users`
- Supabase OAuth (Google) is wired up but falls back to a mock user if OAuth isn't configured
- Role is inferred: email containing "admin" → admin role
- Session persisted in `localStorage` keys: `cinematch_auth_user`, `cinematch_auth_role`

## Recommendation engine (`src/services/recommendationEngine.js`)
Three exported functions:

### `generatePersonalizedRecommendations(userRatings, allMovies, userGenres)`
Hybrid CF scoring pipeline:
1. **Cold start** (0 ratings): sort by community rating; genre-based reason from onboarding prefs
2. **User taste vector**: weighted genre preferences from rated movies (rating >= 3 = positive weight, < 3 = negative)
3. **User-User CF**: cosine similarity against `COMMUNITY_USERS` mock matrix; top neighbors vote on unseen movies
4. **Item-Item CF**: cosine similarity of the user's highest-rated movie vs all others
5. **Weighted blend**: genre affinity 45% + item similarity 35% + community prediction 20%
6. **Normalisation**: raw scores mapped to 10–98% range for visible spread

### `getSimilarMovies(targetMovie, allMovies, topN=4)`
Item-Item CF — returns top N movies by cosine similarity to target (used in MovieDetailsModal).

### `calculateTasteProfile(userRatings, allMovies)`
Returns `{ totalRated, avgRating, topGenres, ratingDistribution, archetype }` for TasteProfileModal.

### `cosineSimilarity(vecA, vecB)` / `getMovieFeatureVector(movie)`
Primitives: binary genre vector + director influence (0.5 weight).

## Supabase integration
- **Optional** — all Supabase calls have local fallbacks
- Config: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`, or enter them at runtime via SupabaseConfigModal (saved to localStorage)
- `supabaseClient.js` initialises the client lazily; `isSupabaseConnected()` guards all service calls
- DB tables expected: `movies`, `ratings` (upsert on `user_id,movie_id`), `movie_similarities`, `user_profiles`
- SQL schema string is exported from `supabaseClient.js` as `SUPABASE_SQL_SCHEMA`
- When Supabase returns data, `featured` flag is hardcoded for movie IDs 1, 296, 318, 356

## App state (App.jsx)
| State | Persisted | Description |
|---|---|---|
| `userRatings` | `cinematch_ratings` localStorage | `{ movieId: starRating }` |
| `selectedGenres` | `cinematch_user_genres` localStorage | Genre filter; `'dismissed'` sentinel → `['__all__']` |
| `movies` | No (loaded on mount) | From Supabase or `INITIAL_MOVIES` fallback |
| `dataSource` | No | `'local'` or `'supabase'` |
| `activeTab` | No | `'for-you'` \| `'top-rated'` \| `'all'` \| `'my-ratings'` |

## Key behaviours
- **Genre onboarding modal** shown only when `selectedGenres.length === 0` (first-ever visit)
- **Calibration banner** shown when `ratedCount < 3`
- `scoredMovies` recomputed via `useMemo` on every ratings/movies/genres change
- Rating sync to Supabase is fire-and-forget (errors are swallowed with a console.warn)
- `handleRateMovie` uses `'default_user'` as userId when syncing — not tied to logged-in user

## Data
- `INITIAL_MOVIES`: ~20+ hardcoded movies with Unsplash poster/backdrop URLs
- `COMMUNITY_USERS`: mock user rating matrix used for User-User CF when Supabase is unavailable
- `GENRES`: flat string array used for feature vectors and FilterBar

## Known limitations / things to be aware of
- Passwords stored in plaintext in localStorage (`cinematch_custom_users`) — demo only
- Rating sync uses hardcoded `'default_user'` instead of `user.id`
- `data/movies.csv` exists in the repo root but is not imported anywhere (likely legacy)
- Python `venv/` is in the project root — unrelated to the JS frontend
