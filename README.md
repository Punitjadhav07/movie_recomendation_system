# 🎬 CineMatch — Scalable Movie Recommendation System

An intelligent, full-stack Movie Recommendation System built with **React 18, Vite, Collaborative Filtering (CF)**, and **Supabase (PostgreSQL)**.

---

## 🌟 Key Features

1. **⚡ Personalized Hybrid Collaborative Filtering Engine**:
   - **Item-Item CF (Cosine Similarity)**: Measures feature vector closeness between movies (genres, directors, community rating patterns).
   - **User-User CF (Neighborhood Matching)**: Simulates synthetic community taste profiles to predict unrated gems.
   - **Real-Time Dynamic Recalibration**: Instant updates to match percentages (e.g., *98% Match*) and algorithmic rationales (*"Because you rated Inception 5★"*).

2. **🎨 Clean, Modern Cinema Interface**:
   - Slate & dark-charcoal palette with subtle indigo highlights and emerald match indicators.
   - Comprehensive movie discovery catalog with multi-genre filters, sort by match score, release year, or rating.
   - Interactive movie modals with cast, synopses, and item similarity rows.
   - Quick taste calibration drawer with celebration confetti.
   - Visual user taste profile analytics & genre affinity breakdown.

3. **🗄️ Supabase PostgreSQL Backend & Database**:
   - Ready-to-deploy SQL migration scripts in [`supabase/migrations/01_schema.sql`](supabase/migrations/01_schema.sql).
   - Seed datasets with curated movies and rating vectors in [`supabase/seed.sql`](supabase/seed.sql).
   - Integrated client service with automatic offline / local state fallback.

---

## 🚀 Quickstart & Setup

### 1. Run the Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```bash
npm run build
npm run preview
```

---

## ☁️ Supabase Configuration (Optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run:
   - [`supabase/migrations/01_schema.sql`](supabase/migrations/01_schema.sql) (Creates `movies`, `ratings`, `user_profiles` tables & stored procedures).
   - [`supabase/seed.sql`](supabase/seed.sql) (Seeds initial catalog and community ratings).
3. In the CineMatch UI, click the **Supabase** button in the top navbar.
4. Enter your **Project URL** and **Anon API Key** to connect.

---

## 📁 Project Structure

```
├── public/
├── scripts/
│   └── process_dataset.js          # Ingestion & dataset processing utility
├── src/
│   ├── components/
│   │   ├── FilterBar.jsx           # Genre and sort filter toolbar
│   │   ├── HeroBanner.jsx          # Top algorithmic pick spotlight
│   │   ├── MovieCard.jsx           # Interactive movie card with star rating
│   │   ├── MovieDetailsModal.jsx   # Movie overview & item-item similarity
│   │   ├── Navbar.jsx              # Navigation and search bar
│   │   ├── QuickRateDrawer.jsx     # Fast calibration drawer
│   │   ├── SupabaseConfigModal.jsx # Supabase cloud connection settings
│   │   └── TasteProfileModal.jsx   # Taste persona & CF analytics modal
│   ├── data/
│   │   └── mockMovies.js           # Curated movies catalog & community seed users
│   ├── services/
│   │   ├── recommendationEngine.js # Cosine similarity & CF scoring algorithms
│   │   ├── supabaseClient.js       # Supabase client & SQL schema definition
│   │   └── supabaseService.js      # Backend data queries & rating sync layer
│   ├── App.jsx                     # Main application orchestrator
│   ├── index.css                   # Slate design system stylesheet
│   └── main.jsx                    # React entrypoint
└── supabase/
    ├── migrations/01_schema.sql    # PostgreSQL schema, RLS policies, and functions
    └── seed.sql                    # Initial seed data for movies and ratings
```
