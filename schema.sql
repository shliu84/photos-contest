PRAGMA foreign_keys = ON;

/* =========================
   DROP OLD TABLES
========================= */
DROP TABLE IF EXISTS submission_reviews;
DROP TABLE IF EXISTS photo_reviews;
DROP TABLE IF EXISTS review_assignments;

DROP TABLE IF EXISTS photo_variants;
DROP TABLE IF EXISTS photos;

DROP TABLE IF EXISTS submission_contacts;
DROP TABLE IF EXISTS submissions;

DROP TABLE IF EXISTS draft_photos;
DROP TABLE IF EXISTS upload_sessions;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS app_settings;

/* =========================
   SETTINGS
========================= */
CREATE TABLE app_settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

/* =========================
   DRAFT STAGING
========================= */
CREATE TABLE upload_sessions (
  id TEXT PRIMARY KEY,

  email TEXT,

  state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open','committed','expired')),

  expires_at_ms INTEGER NOT NULL,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE draft_photos (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,

  r2_key TEXT NOT NULL,
  rotation INTEGER CHECK (rotation IN (0,90,180,270)),
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (session_id) REFERENCES upload_sessions(id)
);

/* =========================
   FINAL SUBMISSION
========================= */
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,

  upload_session_id TEXT,

  work_title TEXT NOT NULL,
  work_description TEXT NOT NULL,

  agreed_terms INTEGER NOT NULL DEFAULT 0
    CHECK (agreed_terms IN (0,1)),

  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','invalid')),

  admin_note TEXT,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,

  FOREIGN KEY (upload_session_id) REFERENCES upload_sessions(id)
);

CREATE TABLE submission_contacts (
  submission_id TEXT PRIMARY KEY,

  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name_kana TEXT NOT NULL,
  first_name_kana TEXT NOT NULL,

  pen_name TEXT,

  gender TEXT NOT NULL
    CHECK (gender IN ('male','female','other')),

  birth_date TEXT NOT NULL
    CHECK (birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

  email TEXT NOT NULL,
  email_norm TEXT NOT NULL,

  postal_code TEXT NOT NULL,
  postal_code_norm TEXT NOT NULL,

  prefecture TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,

  phone TEXT,
  phone_norm TEXT,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,

  original_filename TEXT NOT NULL,
  draft_photo_id TEXT,

  shoot_date TEXT,
  shoot_location TEXT,
  caption TEXT,

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','hidden','replaced','invalid')),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (draft_photo_id) REFERENCES draft_photos(id)
);

CREATE TABLE photo_variants (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,

  kind TEXT NOT NULL
    CHECK (kind IN ('original','web_hd','list_thumb')),

  r2_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  width_px INTEGER CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),

  is_ready INTEGER NOT NULL DEFAULT 0
    CHECK (is_ready IN (0,1)),

  generated_at_ms INTEGER,

  error_code TEXT,
  error_message TEXT,

  created_at_ms INTEGER NOT NULL,

  CHECK ((width_px IS NULL) = (height_px IS NULL)),

  FOREIGN KEY (photo_id) REFERENCES photos(id)
);

/* =========================
   ADMIN / JUDGING
========================= */
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,

  role TEXT NOT NULL
    CHECK (role IN ('admin','judge')),

  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0,1)),

  created_at_ms INTEGER NOT NULL
);

CREATE TABLE review_assignments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  assigned_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (judge_id) REFERENCES users(id)
);

CREATE TABLE photo_reviews (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  comment TEXT,

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (photo_id) REFERENCES photos(id),
  FOREIGN KEY (judge_id) REFERENCES users(id)
);

CREATE TABLE submission_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  comment TEXT,

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (judge_id) REFERENCES users(id)
);
