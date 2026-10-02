// CineMatch Dataset Ingestion & Processing Utility
// Usage: node scripts/process_dataset.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', 'data');
const moviesPath = path.join(dataDir, 'movies.csv');
const ratingsPath = path.join(dataDir, 'ratings.csv');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const records = lines.slice(1).map(line => {
    const values = line.split(',');
    const record = {};
    header.forEach((col, idx) => {
      // Convert numeric fields where appropriate
      const raw = values[idx];
      const num = Number(raw);
      record[col.trim()] = isNaN(num) ? raw.trim() : num;
    });
    return record;
  });
  return records;
}

console.log('--- Processing Movie Dataset for Collaborative Filtering ---');

// Load and parse datasets
const movies = parseCSV(moviesPath);
const ratings = parseCSV(ratingsPath);

console.log(`Loaded ${movies.length} movies from movies.csv`);
console.log(`Loaded ${ratings.length} ratings from ratings.csv`);

// Example: you can now proceed with further processing, e.g., building interaction matrices.
// For now we just output summary statistics.

console.log('Dataset processing completed successfully.');
