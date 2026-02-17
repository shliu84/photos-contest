-- 重建（危险操作：会清空数据）
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS submissions;

-- 投稿主表：把前端表单字段一次性都放进来
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,

  -- 作品信息
  work_title TEXT NOT NULL,
  episode TEXT NOT NULL,

  -- 拍摄信息（可选）
  shoot_date TEXT,          -- YYYY-MM-DD（前端 date input）
  shoot_location TEXT,      -- ueno/wakayama/kobe/china/other/自由文本也行

  -- 投稿人信息
  name_kanji TEXT NOT NULL,
  name_kana TEXT NOT NULL,
  pen_name TEXT,            -- 可选
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- 同意
  agreed_terms INTEGER NOT NULL DEFAULT 0,

  created_at INTEGER NOT NULL
);

-- 图片表：一条记录对应一张图
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,

  r2_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,

  sort_order INTEGER NOT NULL, -- 0..4

  created_at INTEGER NOT NULL,

  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- 每个投稿同一排序位只能有一张（0~4）
CREATE UNIQUE INDEX idx_photos_submission_sort
ON photos(submission_id, sort_order);

-- 常用查询索引
CREATE INDEX idx_photos_submission_id ON photos(submission_id);
CREATE INDEX idx_submissions_email ON submissions(email);
CREATE INDEX idx_submissions_created_at ON submissions(created_at);

-- 强制限制：每个 submission 最多 5 张图
CREATE TRIGGER limit_photos_per_submission
BEFORE INSERT ON photos
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN (SELECT COUNT(*) FROM photos WHERE submission_id = NEW.submission_id) >= 5
      THEN RAISE(ABORT, 'Too many photos for this submission (max 5).')
    END;
END;

-- 强制 sort_order 范围 0..4
CREATE TRIGGER photos_sort_order_range
BEFORE INSERT ON photos
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.sort_order < 0 OR NEW.sort_order > 4
      THEN RAISE(ABORT, 'sort_order must be between 0 and 4.')
    END;
END;
