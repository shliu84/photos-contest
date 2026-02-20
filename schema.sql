-- submission_photo_system_v4
-- Target: Cloudflare D1 (SQLite)

-- =========================
-- DROP OLD TABLES (dependents first)
-- =========================
DROP TABLE IF EXISTS submission_reviews;
DROP TABLE IF EXISTS photo_reviews;
DROP TABLE IF EXISTS review_assignments;

DROP TABLE IF EXISTS photo_variants;
DROP TABLE IF EXISTS photos;

DROP TABLE IF EXISTS submission_contacts;
DROP TABLE IF EXISTS submissions;

DROP TABLE IF EXISTS stored_images;
DROP TABLE IF EXISTS upload_sessions;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS app_settings;

-- =========================
-- SETTINGS
-- =========================
CREATE TABLE app_settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- =========================
-- DRAFT / STORED OBJECTS
-- =========================
CREATE TABLE upload_sessions (
  id TEXT PRIMARY KEY,

  email TEXT,

  state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open','committed','expired')),

  expires_at_ms INTEGER NOT NULL,

  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- Triggers maintain updated_at_ms:
-- insert => updated_at_ms = created_at_ms
-- update => now() in ms (only if caller didn't change updated_at_ms)
CREATE TRIGGER trg_upload_sessions_updated_at_insert
AFTER INSERT ON upload_sessions
FOR EACH ROW
BEGIN
  UPDATE upload_sessions
  SET updated_at_ms = NEW.created_at_ms
  WHERE id = NEW.id;
END;

CREATE TRIGGER trg_upload_sessions_updated_at_update
AFTER UPDATE ON upload_sessions
FOR EACH ROW
WHEN NEW.updated_at_ms = OLD.updated_at_ms
BEGIN
  UPDATE upload_sessions
  SET updated_at_ms = (CAST(strftime('%s','now') AS INTEGER) * 1000)
  WHERE id = NEW.id;
END;

CREATE TABLE stored_images (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL,

  r2_key TEXT NOT NULL,

  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  rotation INTEGER, -- 0 90 180 270 (如需强制可加 CHECK)

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','final')),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_stored_images_session_id ON stored_images(session_id);
CREATE INDEX idx_stored_images_status ON stored_images(status);

-- =========================
-- FINAL (after submit)
-- =========================
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

  FOREIGN KEY (upload_session_id) REFERENCES upload_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_submissions_upload_session_id ON submissions(upload_session_id);

CREATE TRIGGER trg_submissions_updated_at_insert
AFTER INSERT ON submissions
FOR EACH ROW
BEGIN
  UPDATE submissions
  SET updated_at_ms = NEW.created_at_ms
  WHERE id = NEW.id;
END;

CREATE TRIGGER trg_submissions_updated_at_update
AFTER UPDATE ON submissions
FOR EACH ROW
WHEN NEW.updated_at_ms = OLD.updated_at_ms
BEGIN
  UPDATE submissions
  SET updated_at_ms = (CAST(strftime('%s','now') AS INTEGER) * 1000)
  WHERE id = NEW.id;
END;

-- 1:1 PII table
CREATE TABLE submission_contacts (
  submission_id TEXT PRIMARY KEY,

  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name_kana TEXT NOT NULL,
  first_name_kana TEXT NOT NULL,

  pen_name TEXT,

  gender TEXT NOT NULL CHECK (gender IN ('male','female','other')),

  -- ISO date string 'YYYY-MM-DD'
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

CREATE INDEX idx_submission_contacts_email_norm ON submission_contacts(email_norm);
CREATE INDEX idx_submission_contacts_postal_code_norm ON submission_contacts(postal_code_norm);

CREATE TRIGGER trg_submission_contacts_updated_at_insert
AFTER INSERT ON submission_contacts
FOR EACH ROW
BEGIN
  UPDATE submission_contacts
  SET updated_at_ms = NEW.created_at_ms
  WHERE submission_id = NEW.submission_id;
END;

CREATE TRIGGER trg_submission_contacts_updated_at_update
AFTER UPDATE ON submission_contacts
FOR EACH ROW
WHEN NEW.updated_at_ms = OLD.updated_at_ms
BEGIN
  UPDATE submission_contacts
  SET updated_at_ms = (CAST(strftime('%s','now') AS INTEGER) * 1000)
  WHERE submission_id = NEW.submission_id;
END;

CREATE TABLE photos (
  id TEXT PRIMARY KEY,

  submission_id TEXT NOT NULL,

  stored_image_id TEXT NOT NULL,

  original_filename TEXT NOT NULL,
  photo_title TEXT,
  photo_description TEXT,
  shoot_date TEXT,
  shoot_location TEXT,

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','hidden','replaced','invalid')),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (stored_image_id) REFERENCES stored_images(id) ON DELETE RESTRICT
);

CREATE INDEX idx_photos_submission_id ON photos(submission_id);
CREATE INDEX idx_photos_stored_image_id ON photos(stored_image_id);
CREATE UNIQUE INDEX uq_photos_submission_sort_order ON photos(submission_id, sort_order);
CREATE UNIQUE INDEX uq_photos_stored_image_id ON photos(stored_image_id);

CREATE TABLE photo_variants (
  id TEXT PRIMARY KEY,

  photo_id TEXT NOT NULL,

  kind TEXT NOT NULL CHECK (kind IN ('original','web_hd','list_thumb')),

  r2_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  width_px INTEGER CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),

  is_ready INTEGER NOT NULL DEFAULT 0 CHECK (is_ready IN (0,1)),
  generated_at_ms INTEGER,

  error_code TEXT,
  error_message TEXT,

  created_at_ms INTEGER NOT NULL,

  -- keep dimensions paired
  CHECK (
    (width_px IS NULL AND height_px IS NULL) OR
    (width_px IS NOT NULL AND height_px IS NOT NULL)
  ),

  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE INDEX idx_photo_variants_photo_id ON photo_variants(photo_id);
CREATE UNIQUE INDEX uq_photo_variants_photo_kind ON photo_variants(photo_id, kind);

-- =========================
-- ADMIN / JUDGING
-- =========================
CREATE TABLE users (
  id TEXT PRIMARY KEY,

  email TEXT NOT NULL UNIQUE,
  display_name TEXT,

  role TEXT NOT NULL CHECK (role IN ('admin','judge')),

  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),

  created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE review_assignments (
  id TEXT PRIMARY KEY,

  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  assigned_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_assignments_submission_id ON review_assignments(submission_id);
CREATE INDEX idx_review_assignments_judge_id ON review_assignments(judge_id);
CREATE UNIQUE INDEX uq_review_assignments_submission_judge ON review_assignments(submission_id, judge_id);

CREATE TABLE photo_reviews (
  id TEXT PRIMARY KEY,

  photo_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  comment TEXT,
  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_photo_reviews_photo_id ON photo_reviews(photo_id);
CREATE INDEX idx_photo_reviews_judge_id ON photo_reviews(judge_id);
CREATE UNIQUE INDEX uq_photo_reviews_photo_judge ON photo_reviews(photo_id, judge_id);

CREATE TABLE submission_reviews (
  id TEXT PRIMARY KEY,

  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  comment TEXT,
  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_reviews_submission_id ON submission_reviews(submission_id);
CREATE INDEX idx_submission_reviews_judge_id ON submission_reviews(judge_id);
CREATE UNIQUE INDEX uq_submission_reviews_submission_judge ON submission_reviews(submission_id, judge_id);