-- =========================================================
-- CineMatch: Seed Data for Movies and Community Ratings
-- =========================================================

INSERT INTO public.movies (id, title, year, genres, rating, vote_count, runtime, director, cast_members, overview, poster, backdrop, tagline)
VALUES
(1, 'Inception', 2010, ARRAY['Sci-Fi', 'Action', 'Thriller'], 4.8, 24500, '148 min', 'Christopher Nolan', ARRAY['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'], 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80', 'Your mind is the scene of the crime.'),
(2, 'Interstellar', 2014, ARRAY['Sci-Fi', 'Drama', 'Adventure'], 4.9, 22100, '169 min', 'Christopher Nolan', ARRAY['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'], 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80', 'Mankind was born on Earth. It was never meant to die here.'),
(3, 'The Dark Knight', 2008, ARRAY['Action', 'Crime', 'Drama'], 4.9, 28900, '152 min', 'Christopher Nolan', ARRAY['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Michael Caine'], 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&auto=format&fit=crop&q=80', 'Why so serious?'),
(4, 'Parasite', 2019, ARRAY['Drama', 'Thriller', 'Comedy'], 4.8, 17800, '132 min', 'Bong Joon Ho', ARRAY['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'], 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80', 'Act like you own the place.'),
(5, 'Blade Runner 2049', 2017, ARRAY['Sci-Fi', 'Mystery', 'Drama'], 4.7, 15300, '164 min', 'Denis Villeneuve', ARRAY['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks'], 'Young Blade Runner K''s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who''s been missing for thirty years.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80', 'The key to the future is finally unearthed.'),
(6, 'Pulp Fiction', 1994, ARRAY['Crime', 'Drama'], 4.9, 26400, '154 min', 'Quentin Tarantino', ARRAY['John Travolta', 'Uma Thurman', 'Samuel L. Jackson', 'Bruce Willis'], 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1600&auto=format&fit=crop&q=80', 'Just because you are a character doesn''t mean that you have character.'),
(7, 'Whiplash', 2014, ARRAY['Drama', 'Music'], 4.8, 16200, '106 min', 'Damien Chazelle', ARRAY['Miles Teller', 'J.K. Simmons', 'Paul Reiser', 'Melissa Benoist'], 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student''s potential.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1600&auto=format&fit=crop&q=80', 'The road to greatness can take you to the edge.'),
(8, 'Spider-Man: Into the Spider-Verse', 2018, ARRAY['Animation', 'Action', 'Adventure', 'Sci-Fi'], 4.8, 19400, '117 min', 'Bob Persichetti, Peter Ramsey, Rodney Rothman', ARRAY['Shameik Moore', 'Jake Johnson', 'Hailee Steinfeld', 'Mahershala Ali'], 'Teen Miles Morales becomes the new Spider-Man and joins other Spider-Heroes from parallel universes to stop a threat to all reality.', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&auto=format&fit=crop&q=80', 'More than one wears the mask.'),
(9, 'Dune: Part Two', 2024, ARRAY['Sci-Fi', 'Adventure', 'Action'], 4.9, 18200, '166 min', 'Denis Villeneuve', ARRAY['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem'], 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80', 'Long live the fighters.'),
(10, 'The Grand Budapest Hotel', 2014, ARRAY['Comedy', 'Drama', 'Adventure'], 4.7, 14900, '99 min', 'Wes Anderson', ARRAY['Ralph Fiennes', 'F. Murray Abraham', 'Mathieu Amalric', 'Adrien Brody'], 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel''s glorious years under an exceptional concierge.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&auto=format&fit=crop&q=80', 'A lively tale of murder, theft, and the finest hospitality.'),
(11, 'Fight Club', 1999, ARRAY['Drama', 'Thriller'], 4.8, 23100, '139 min', 'David Fincher', ARRAY['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter', 'Meat Loaf'], 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1600&auto=format&fit=crop&q=80', 'Mischief. Mayhem. Soap.'),
(12, 'Spirited Away', 2001, ARRAY['Animation', 'Adventure', 'Family', 'Fantasy'], 4.9, 16500, '125 min', 'Hayao Miyazaki', ARRAY['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Takashi Naito'], 'During her family''s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80', 'Nothing that happens is ever forgotten, even if you can''t remember.')
ON CONFLICT (id) DO NOTHING;

-- Seed Synthetic Community Ratings for Collaborative Filtering Training
INSERT INTO public.ratings (user_id, movie_id, rating)
VALUES
('u_cinephile', 1, 5.0),
('u_cinephile', 2, 5.0),
('u_cinephile', 5, 5.0),
('u_cinephile', 9, 5.0),
('u_cinephile', 3, 4.0),
('u_thrill', 3, 5.0),
('u_thrill', 6, 5.0),
('u_thrill', 11, 5.0),
('u_thrill', 4, 4.0),
('u_thrill', 1, 4.0),
('u_art', 4, 5.0),
('u_art', 7, 5.0),
('u_art', 10, 5.0),
('u_art', 12, 5.0),
('u_art', 5, 4.0),
('u_anim', 8, 5.0),
('u_anim', 12, 5.0),
('u_anim', 2, 4.0),
('u_anim', 10, 4.0)
ON CONFLICT (user_id, movie_id) DO NOTHING;
