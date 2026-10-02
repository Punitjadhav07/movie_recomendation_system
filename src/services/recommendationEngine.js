import { INITIAL_MOVIES, COMMUNITY_USERS, GENRES } from '../data/mockMovies';

/**
 * Calculates Cosine Similarity between two numeric or feature vectors
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  for (const key of allKeys) {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Converts a movie's genres and metadata into a binary/weighted feature vector
 */
export function getMovieFeatureVector(movie) {
  const vector = {};
  const activeGenres = GENRES.filter(g => g !== 'All');
  
  activeGenres.forEach(genre => {
    vector[genre] = movie.genres.includes(genre) ? 1.0 : 0.0;
  });

  // Include director influence
  vector[`director_${movie.director}`] = 0.5;
  
  return vector;
}

/**
 * Computes top N most similar movies to a target movie (Item-Item CF)
 */
export function getSimilarMovies(targetMovie, allMovies = INITIAL_MOVIES, topN = 4) {
  const targetVec = getMovieFeatureVector(targetMovie);

  const scored = allMovies
    .filter(m => m.id !== targetMovie.id)
    .map(movie => {
      const movieVec = getMovieFeatureVector(movie);
      const similarity = cosineSimilarity(targetVec, movieVec);
      return {
        ...movie,
        similarityScore: Math.round(similarity * 100)
      };
    });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, topN);
}

/**
 * Computes personalized recommendations based on the user's rating profile
 * Uses a hybrid Collaborative Filtering model (User-User + Item-Item)
 * @param {object} userRatings  - { movieId: starRating }
 * @param {Array}  allMovies    - full movie list
 * @param {Array}  userGenres   - genres chosen during onboarding (may be empty)
 */
export function generatePersonalizedRecommendations(userRatings, allMovies = INITIAL_MOVIES, userGenres = []) {
  const ratedMovieIds = Object.keys(userRatings).map(Number);
  const ratedCount = ratedMovieIds.length;

  // Cold start: no ratings yet — sort by community rating and show genre-based reason
  if (ratedCount === 0) {
    const activeGenres = userGenres.filter(g => g !== '__all__' && g !== 'All');
    return allMovies.map(movie => {
      // Find which of the user's preferred genres this movie matches
      const matchedGenre = activeGenres.find(g => movie.genres.includes(g));
      const reason = matchedGenre
        ? `Because you like ${matchedGenre}`
        : 'Highly rated by the community';
      return {
        ...movie,
        matchPercentage: null,
        recommendationReason: reason,
        isRecommended: true
      };
    }).sort((a, b) => b.rating - a.rating);
  }

  // 1. Build User Taste Vector from rated movies
  const userGenrePreferences = {};
  let totalRatingWeight = 0;
  let maxGenreScore = 0;

  ratedMovieIds.forEach(id => {
    const movie = allMovies.find(m => m.id === id);
    const rating = userRatings[id]; // 0.5 to 5.0
    if (movie) {
      const weight = rating >= 3.0 ? rating : -(3.0 - rating);
      totalRatingWeight += Math.abs(weight);
      movie.genres.forEach(genre => {
        userGenrePreferences[genre] = (userGenrePreferences[genre] || 0) + weight;
      });
    }
  });

  // Compute max possible genre score for normalisation
  allMovies.forEach(movie => {
    let gs = 0;
    movie.genres.forEach(genre => { gs += (userGenrePreferences[genre] || 0); });
    if (gs > maxGenreScore) maxGenreScore = gs;
  });

  // 2. Find Nearest Community Neighbors (User-User Collaborative Filtering)
  const neighborSimilarities = COMMUNITY_USERS.map(communityUser => {
    const similarity = cosineSimilarity(userRatings, communityUser.ratings);
    return { ...communityUser, similarity };
  }).filter(n => n.similarity > 0.1);

  neighborSimilarities.sort((a, b) => b.similarity - a.similarity);
  const topNeighbor = neighborSimilarities[0] || null;

  // 3. Find highest rated movie by current user
  let highestRatedId = ratedMovieIds[0];
  let maxRating = userRatings[highestRatedId] || 0;
  ratedMovieIds.forEach(id => {
    if (userRatings[id] > maxRating) {
      maxRating = userRatings[id];
      highestRatedId = id;
    }
  });
  const anchorMovie = allMovies.find(m => m.id === highestRatedId);

  // 4. Score all movies
  const rawScores = [];

  const scoredMovies = allMovies.map(movie => {
    const userRating = userRatings[movie.id];
    const isAlreadyRated = userRating !== undefined;

    // Genre Affinity Score (0–1, normalised against max observed genre score)
    let genreScore = 0;
    movie.genres.forEach(genre => {
      genreScore += (userGenrePreferences[genre] || 0);
    });
    const normGenreScore = maxGenreScore > 0 ? Math.max(0, genreScore / maxGenreScore) : 0;

    // Item Similarity to Anchor Movie (0–1)
    let itemSimilarity = 0;
    if (anchorMovie && movie.id !== anchorMovie.id) {
      const anchorVec = getMovieFeatureVector(anchorMovie);
      const currentVec = getMovieFeatureVector(movie);
      itemSimilarity = cosineSimilarity(anchorVec, currentVec);
    }

    // Community Neighbor Predicted Rating (0–1)
    let neighborRatingPrediction = 0;
    let neighborWeightSum = 0;
    neighborSimilarities.forEach(neighbor => {
      if (neighbor.ratings[movie.id]) {
        neighborRatingPrediction += neighbor.similarity * neighbor.ratings[movie.id];
        neighborWeightSum += neighbor.similarity;
      }
    });
    const predictedCommunityRating = neighborWeightSum > 0
      ? neighborRatingPrediction / neighborWeightSum
      : movie.rating;
    const normCommunity = Math.min(1, predictedCommunityRating / 5.0);

    // Weighted combination: genre (45%) + item similarity (35%) + community (20%)
    const rawScore = (normGenreScore * 0.45) + (itemSimilarity * 0.35) + (normCommunity * 0.20);
    rawScores.push(rawScore);

    // Generate dynamic explanation
    let reason = "Top community match";
    if (anchorMovie && itemSimilarity > 0.4) {
      reason = `Because you rated "${anchorMovie.title}" ${maxRating}★`;
    } else if (topNeighbor && topNeighbor.ratings[movie.id]) {
      reason = `Loved by viewers similar to ${topNeighbor.name.split(' ')[0]}`;
    } else if (genreScore > 2) {
      const topGenre = movie.genres.find(g => (userGenrePreferences[g] || 0) > 2) || movie.genres[0];
      reason = `Matches your affinity for ${topGenre}`;
    }

    return {
      ...movie,
      userRating: userRating || null,
      isRated: isAlreadyRated,
      _rawScore: rawScore,
      recommendationReason: reason,
      similarityToAnchor: Math.round(itemSimilarity * 100)
    };
  });

  // 5. Normalise raw scores to 10–98% range so there is genuine spread
  const minRaw = Math.min(...rawScores);
  const maxRaw = Math.max(...rawScores);
  const rangeRaw = maxRaw - minRaw || 1;

  return scoredMovies.map(movie => {
    const normalised = (movie._rawScore - minRaw) / rangeRaw; // 0–1
    // Map to 10–98 range so low matches show low scores and high matches show high scores
    const matchPct = Math.round(10 + normalised * 88);
    const { _rawScore, ...rest } = movie;
    return { ...rest, matchPercentage: matchPct };
  });
}


/**
 * Computes User Taste Profile statistics for the analytics modal
 */
export function calculateTasteProfile(userRatings, allMovies = INITIAL_MOVIES) {
  const ratedMovieIds = Object.keys(userRatings).map(Number);
  const totalRated = ratedMovieIds.length;

  if (totalRated === 0) {
    return {
      totalRated: 0,
      avgRating: 0,
      topGenres: [],
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      archetype: "New Cinephile (Uncalibrated)"
    };
  }

  let totalStars = 0;
  const genreCounts = {};
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  ratedMovieIds.forEach(id => {
    const rating = userRatings[id];
    totalStars += rating;
    const rounded = Math.round(rating);
    if (ratingDistribution[rounded] !== undefined) {
      ratingDistribution[rounded]++;
    }

    const movie = allMovies.find(m => m.id === id);
    if (movie) {
      movie.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  const sortedGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count, percentage: Math.round((count / totalRated) * 100) }))
    .sort((a, b) => b.count - a.count);

  let archetype = "Eclectic Explorer";
  if (sortedGenres.length > 0) {
    const top = sortedGenres[0].genre;
    if (top === "Sci-Fi") archetype = "Sci-Fi Visionary";
    else if (top === "Drama") archetype = "Thoughtful Drama Connoisseur";
    else if (top === "Action") archetype = "High-Octane Enthusiast";
    else if (top === "Animation") archetype = "Animation & Story Aficionado";
    else if (top === "Thriller") archetype = "Suspense & Mystery Sleuth";
    else archetype = `${top} Enthusiast`;
  }

  return {
    totalRated,
    avgRating: (totalStars / totalRated).toFixed(1),
    topGenres: sortedGenres.slice(0, 4),
    ratingDistribution,
    archetype
  };
}
