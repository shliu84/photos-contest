/* ============================================================================
schema_ms.sql — submission_photo_system (SQLite / Cloudflare D1)
Version: 2.0 (rebuild, milliseconds)
Encoding: UTF-8

Time policy:
- All *_at_ms fields are Unix timestamp in MILLISECONDS (JavaScript Date.now()).

This file is DESTRUCTIVE:
- Includes DROP TABLE statements (DEV rebuild only).
- For production, write a migration (ALTER + backfill).
============================================================================ */

PRAGMA foreign_keys = ON;

/* =========================
   DROP (DANGEROUS)
   ========================= */
DROP TABLE IF EXISTS photo_reviews;
DROP TABLE IF EXISTS submission_reviews;
DROP TABLE IF EXISTS review_assignments;
DROP TABLE IF EXISTS users;

DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS submissions;

DROP TABLE IF EXISTS app_settings;

/* =========================
   SETTINGS (optional but useful)
   ========================= */
CREATE TABLE app_settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- Make max photos configurable without schema changes
INSERT INTO app_settings(k, v) VALUES ('max_photos_per_submission', '5');

/* =========================
   SUBMISSIONS (v1 + extensions)
   ========================= */
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,

  -- 作品信息
  work_title TEXT NOT NULL,
  episode TEXT NOT NULL,

  -- 拍摄信息（可选）
  shoot_date TEXT,          -- YYYY-MM-DD
  shoot_location TEXT,

  -- 投稿人信息
  name_kanji TEXT NOT NULL,
  name_kana  TEXT NOT NULL,
  pen_name   TEXT,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,

  -- 同意
  agreed_terms INTEGER NOT NULL DEFAULT 0 CHECK (agreed_terms IN (0,1)),

  -- 流程状态（管理/评审用；现在不用也不影响）
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted',     -- 已提交
      'locked',        -- 锁定（截止后/进入评审）
      'invalid',       -- 无效/违规
      'shortlisted',   -- 入围（可选）
      'winner'         -- 获奖（可选）
    )),

  -- 管理员备注
  admin_note TEXT,

  -- 时间（毫秒）
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_submissions_email         ON submissions(email);
CREATE INDEX idx_submissions_created_at_ms ON submissions(created_at_ms);
CREATE INDEX idx_submissions_status        ON submissions(status);

-- 自动维护 updated_at_ms（插入时 = created_at_ms）
CREATE TRIGGER trg_submissions_set_updated_at_insert
AFTER INSERT ON submissions
FOR EACH ROW
BEGIN
  UPDATE submissions
     SET updated_at_ms = NEW.created_at_ms
   WHERE id = NEW.id;
END;

-- 更新时设置 updated_at_ms = now(ms)
CREATE TRIGGER trg_submissions_set_updated_at_update
AFTER UPDATE ON submissions
FOR EACH ROW
BEGIN
  UPDATE submissions
     SET updated_at_ms = CAST(strftime('%s','now') AS INTEGER) * 1000
   WHERE id = NEW.id;
END;

/* =========================
   PHOTOS (v1 + extensions)
   ========================= */
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,

  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),

  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 4),

  -- 照片状态（管理/评审用）
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','hidden','replaced','invalid')),

  created_at_ms INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,

  -- 同一投稿同一排序位只能有一张
  UNIQUE (submission_id, sort_order)
);

-- 常用查询索引
CREATE INDEX idx_photos_submission_id ON photos(submission_id);
CREATE INDEX idx_photos_status        ON photos(status);
CREATE INDEX idx_photos_created_at_ms ON photos(created_at_ms);

-- 限制：每个 submission 最多 N 张图（默认 5，可配置）
CREATE TRIGGER trg_photos_limit_per_submission_insert
BEFORE INSERT ON photos
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (
        SELECT COUNT(*) FROM photos WHERE submission_id = NEW.submission_id
      ) >= (
        SELECT CAST(v AS INTEGER) FROM app_settings WHERE k='max_photos_per_submission'
      )
      THEN RAISE(ABORT, 'Too many photos for this submission.')
    END;
END;

-- 防止 UPDATE submission_id 时绕过限制
CREATE TRIGGER trg_photos_limit_per_submission_update_submission
BEFORE UPDATE OF submission_id ON photos
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.submission_id <> OLD.submission_id
       AND (
        SELECT COUNT(*) FROM photos WHERE submission_id = NEW.submission_id
      ) >= (
        SELECT CAST(v AS INTEGER) FROM app_settings WHERE k='max_photos_per_submission'
      )
      THEN RAISE(ABORT, 'Too many photos for this submission.')
    END;
END;

-- sort_order 的 CHECK 已经能拦截；这里额外覆盖 UPDATE，给更明确错误信息（可删）
CREATE TRIGGER trg_photos_sort_order_range_update
BEFORE UPDATE OF sort_order ON photos
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.sort_order < 0 OR NEW.sort_order > 4
      THEN RAISE(ABORT, 'sort_order must be between 0 and 4.')
    END;
END;

/* =========================
   USERS (admin/judge)
   ========================= */
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','judge')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_active     ON users(is_active);
CREATE INDEX idx_users_created_ms ON users(created_at_ms);

/* =========================
   REVIEW ASSIGNMENTS
   ========================= */
CREATE TABLE review_assignments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  assigned_at_ms INTEGER NOT NULL,

  UNIQUE (submission_id, judge_id),

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_assignments_judge      ON review_assignments(judge_id);
CREATE INDEX idx_assignments_submission ON review_assignments(submission_id);
CREATE INDEX idx_assignments_assigned_ms ON review_assignments(assigned_at_ms);

/* =========================
   PER-PHOTO REVIEWS (score per photo per judge)
   ========================= */
CREATE TABLE photo_reviews (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  comment TEXT,

  created_at_ms INTEGER NOT NULL,

  UNIQUE (photo_id, judge_id),

  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_photo_reviews_photo      ON photo_reviews(photo_id);
CREATE INDEX idx_photo_reviews_judge      ON photo_reviews(judge_id);
CREATE INDEX idx_photo_reviews_created_ms ON photo_reviews(created_at_ms);

/* =========================
   OPTIONAL: OVERALL SUBMISSION REVIEW
   ========================= */
CREATE TABLE submission_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,

  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  comment TEXT,

  created_at_ms INTEGER NOT NULL,

  UNIQUE (submission_id, judge_id),

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_reviews_submission ON submission_reviews(submission_id);
CREATE INDEX idx_submission_reviews_judge      ON submission_reviews(judge_id);
CREATE INDEX idx_submission_reviews_created_ms ON submission_reviews(created_at_ms);
