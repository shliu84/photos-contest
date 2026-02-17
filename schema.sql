DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS photos;

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  agreed_terms INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  r2_key TEXT NOT NULL,
  original_filename TEXT,
  location TEXT,
  year TEXT,
  panda_name TEXT,
  description TEXT,
  sort_order INTEGER
);