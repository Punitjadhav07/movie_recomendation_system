import { Client } from 'pg';
import fs from 'fs';

async function populateSupabase() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const connectionString = 'postgresql://postgres.aaucdhzycalmbznlbvqd:Punitjadhav07@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected!');

    // 1. Load movies
    console.log('Ingesting movies into Supabase...');
    const movies = JSON.parse(fs.readFileSync('data/processed_movies.json', 'utf8'));

    // Batch insert movies
    for (let i = 0; i < movies.length; i += 100) {
      const batch = movies.slice(i, i + 100);
      const values = [];
      const placeholders = batch.map((m, idx) => {
        const offset = idx * 13;
        values.push(
          m.id, m.title, m.year, m.genres, m.rating, m.vote_count,
          m.runtime, m.director, m.cast_members, m.overview, m.poster, m.backdrop, m.tagline
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
      }).join(', ');

      const query = `
        INSERT INTO public.movies (id, title, year, genres, rating, vote_count, runtime, director, cast_members, overview, poster, backdrop, tagline)
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          year = EXCLUDED.year,
          genres = EXCLUDED.genres,
          rating = EXCLUDED.rating,
          vote_count = EXCLUDED.vote_count,
          poster = EXCLUDED.poster,
          backdrop = EXCLUDED.backdrop,
          overview = EXCLUDED.overview;
      `;
      await client.query(query, values);
    }
    console.log(`✅ Ingested ${movies.length} movies.`);

    // 2. Load Item-Item Similarities
    console.log('Ingesting pre-computed movie similarities...');
    const similarities = JSON.parse(fs.readFileSync('data/processed_similarities.json', 'utf8'));
    for (let i = 0; i < similarities.length; i += 250) {
      const batch = similarities.slice(i, i + 250);
      const values = [];
      const placeholders = batch.map((s, idx) => {
        const offset = idx * 3;
        values.push(s.movie_a, s.movie_b, s.similarity_score);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');

      const query = `
        INSERT INTO public.movie_similarities (movie_a, movie_b, similarity_score)
        VALUES ${placeholders}
        ON CONFLICT (movie_a, movie_b) DO UPDATE SET similarity_score = EXCLUDED.similarity_score;
      `;
      await client.query(query, values);
    }
    console.log(`✅ Ingested ${similarities.length} movie similarity pairs.`);

    // 3. Load Community Ratings
    console.log('Ingesting community collaborative filtering ratings...');
    const ratings = JSON.parse(fs.readFileSync('data/processed_ratings.json', 'utf8'));
    for (let i = 0; i < ratings.length; i += 250) {
      const batch = ratings.slice(i, i + 250);
      const values = [];
      const placeholders = batch.map((r, idx) => {
        const offset = idx * 3;
        values.push(r.user_id, r.movie_id, r.rating);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
      }).join(', ');

      const query = `
        INSERT INTO public.ratings (user_id, movie_id, rating)
        VALUES ${placeholders}
        ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating;
      `;
      await client.query(query, values);
    }
    console.log(`✅ Ingested ${ratings.length} community ratings.`);

    // Check counts
    const movieCount = await client.query('SELECT count(*) FROM public.movies;');
    const simCount = await client.query('SELECT count(*) FROM public.movie_similarities;');
    const ratingCount = await client.query('SELECT count(*) FROM public.ratings;');

    console.log('\n📊 Supabase Database Verification Summary:');
    console.log(`- movies: ${movieCount.rows[0].count}`);
    console.log(`- movie_similarities: ${simCount.rows[0].count}`);
    console.log(`- ratings: ${ratingCount.rows[0].count}`);

    await client.end();
  } catch (err) {
    console.error('Population error:', err);
    process.exit(1);
  }
}

populateSupabase();
