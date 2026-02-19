-- schema.sql (D1 / SQLite compatible, NO SQL transactions)
-- submission_photo_system v3.3

PRAGMA foreign_keys = OFF;

-- ============================================================
-- 0) RESET: drop all old tables (no migration, full rebuild)
-- ============================================================

-- REVIEW / JUDGING
DROP TABLE IF EXISTS submission_reviews;
DROP TABLE IF EXISTS photo_reviews;
DROP TABLE IF EXISTS review_assignments;

-- ADMIN
DROP TABLE IF EXISTS users;

-- FINAL (after submit)
DROP TABLE IF EXISTS photo_variants;
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS submissions;

-- DRAFT STAGING
DROP TABLE IF EXISTS draft_photos;
DROP TABLE IF EXISTS upload_sessions;

-- SETTINGS
DROP TABLE IF EXISTS app_settings;

-- Drop triggers (in case they exist)
DROP TRIGGER IF EXISTS trg_upload_sessions_set_updated_at_insert;
DROP TRIGGER IF EXISTS trg_upload_sessions_set_updated_at_update;
DROP TRIGGER IF EXISTS trg_submissions_set_updated_at_insert;
DROP TRIGGER IF EXISTS trg_submissions_set_updated_at_update;

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1) CREATE: tables, indexes, triggers
-- ============================================================

-- =========================
-- app_settings
-- =========================
CREATE TABLE IF NOT EXISTS app_settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- =========================
-- DRAFT STAGING (before submit)
-- =========================
CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,

  email TEXT,

  state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open','committed','expired')),

  expires_at_ms INTEGER NOT NULL,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_email ON upload_sessions(email);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_state ON upload_sessions(state);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at_ms ON upload_sessions(expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at_ms ON upload_sessions(created_at_ms);

-- Triggers maintain updated_at_ms
CREATE TRIGGER IF NOT EXISTS trg_upload_sessions_set_updated_at_insert
AFTER INSERT ON upload_sessions
FOR EACH ROW
BEGIN
  UPDATE upload_sessions
  SET updated_at_ms = NEW.created_at_ms
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_upload_sessions_set_updated_at_update
AFTER UPDATE ON upload_sessions
FOR EACH ROW
BEGIN
  UPDATE upload_sessions
  SET updated_at_ms = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS draft_photos (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,

  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_draft_photos_session_sort_order
  ON draft_photos(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_draft_photos_session_id ON draft_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_photos_created_at_ms ON draft_photos(created_at_ms);

-- =========================
-- FINAL (after submit)
-- =========================
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,

  upload_session_id TEXT,

  work_title TEXT NOT NULL,
  episode TEXT NOT NULL,

  name_kanji TEXT NOT NULL,
  name_kana  TEXT NOT NULL,
  pen_name   TEXT,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,

  agreed_terms INTEGER NOT NULL DEFAULT 0
    CHECK (agreed_terms IN (0,1)),

  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','locked','invalid','shortlisted','winner')),

  admin_note TEXT,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,

  FOREIGN KEY (upload_session_id) REFERENCES upload_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at_ms ON submissions(created_at_ms);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_upload_session_id ON submissions(upload_session_id);

-- Triggers maintain updated_at_ms
CREATE TRIGGER IF NOT EXISTS trg_submissions_set_updated_at_insert
AFTER INSERT ON submissions
FOR EACH ROW
BEGIN
  UPDATE submissions
  SET updated_at_ms = NEW.created_at_ms
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_submissions_set_updated_at_update
AFTER UPDATE ON submissions
FOR EACH ROW
BEGIN
  UPDATE submissions
  SET updated_at_ms = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS photos (
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

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_photo_id) REFERENCES draft_photos(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_photos_submission_sort_order
  ON photos(submission_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_photos_submission_id ON photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_photos_shoot_date ON photos(shoot_date);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_created_at_ms ON photos(created_at_ms);
CREATE INDEX IF NOT EXISTS idx_photos_draft_photo_id ON photos(draft_photo_id);

CREATE TABLE IF NOT EXISTS photo_variants (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,

  kind TEXT NOT NULL
    CHECK (kind IN ('original','web_hd','list_thumb')),

  r2_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  width_px  INTEGER CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),

  is_ready INTEGER NOT NULL DEFAULT 0
    CHECK (is_ready IN (0,1)),
  generated_at_ms INTEGER,

  error_code TEXT,
  error_message TEXT,

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_photo_variants_photo_kind
  ON photo_variants(photo_id, kind);
CREATE INDEX IF NOT EXISTS idx_photo_variants_photo_id ON photo_variants(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_variants_kind ON photo_variants(kind);
CREATE INDEX IF NOT EXISTS idx_photo_variants_ready ON photo_variants(is_ready);
CREATE INDEX IF NOT EXISTS idx_photo_variants_created_at_ms ON photo_variants(created_at_ms);

-- =========================
-- ADMIN / JUDGING
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,

  role TEXT NOT NULL
    CHECK (role IN ('admin','judge')),

  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0,1)),

  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_ms ON users(created_at_ms);

CREATE TABLE IF NOT EXISTS review_assignments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  assigned_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_assignments_submission_judge
  ON review_assignments(submission_id, judge_id);
CREATE INDEX IF NOT EXISTS idx_assignments_judge ON review_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_assignments_submission ON review_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_ms ON review_assignments(assigned_at_ms);

CREATE TABLE IF NOT EXISTS photo_reviews (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  comment TEXT,
  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_photo_reviews_photo_judge
  ON photo_reviews(photo_id, judge_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_photo ON photo_reviews(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_judge ON photo_reviews(judge_id);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_created_ms ON photo_reviews(created_at_ms);

CREATE TABLE IF NOT EXISTS submission_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  comment TEXT,
  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_reviews_submission_judge
  ON submission_reviews(submission_id, judge_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission ON submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_judge ON submission_reviews(judge_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_created_ms ON submission_reviews(created_at_ms);
