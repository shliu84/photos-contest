// functions/api/submissions3.ts

interface PhotoMetaInput {
  sort_order: number;
  shoot_date?: string; 
  shoot_location?: string;
  caption?: string;
}

interface SubmissionBody {
  session_id: string;
  work_title: string;
  episode: string;
  name_kanji: string;
  name_kana: string;
  email: string;
  phone: string;
  agreed_terms: number;
  pen_name?: string;
  photos?: PhotoMetaInput[];
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function requiredString(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function isOptionalString(v: unknown) {
  return v === undefined || v === null || typeof v === "string";
}

function normalizeOptionalString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return json({ error: "Missing D1 binding" }, 500);
  }

  let body: SubmissionBody;
  try {
    body = await request.json<SubmissionBody>();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // 1. 数据基础校验
  if (
    !requiredString(body.session_id) ||
    !requiredString(body.work_title) ||
    !requiredString(body.episode) ||
    !requiredString(body.name_kanji) ||
    !requiredString(body.name_kana) ||
    !requiredString(body.email) ||
    !requiredString(body.phone)
  ) {
    return json({ error: "Missing required fields" }, 400);
  }

  if (body.agreed_terms !== 1) {
    return json({ error: "You must agree to the terms." }, 400);
  }

  const perPhotoMeta = new Map<number, PhotoMetaInput>();
  if (body.photos !== undefined) {
    if (Array.isArray(body.photos)) {
      for (const p of body.photos) {
        if (typeof p.sort_order === "number") perPhotoMeta.set(p.sort_order, p);
      }
    }
  }

  const now = Date.now();
  const submissionId = crypto.randomUUID();
  const sessionId = body.session_id.trim();

  try {
    // 2. 检查 Session 状态
    const sessionRow = await env.DB
      .prepare(`SELECT state, expires_at_ms FROM upload_sessions WHERE id = ?`)
      .bind(sessionId)
      .first<{ state: string; expires_at_ms: number }>();

    if (!sessionRow) return json({ error: "Invalid session_id" }, 400);
    if (sessionRow.state !== "open") return json({ error: "Session is not open (already committed)" }, 409);
    if (sessionRow.expires_at_ms <= now) return json({ error: "Upload session expired" }, 409);

    // 3. 读取草稿照片
    const { results: draftPhotos } = await env.DB
      .prepare(`SELECT id, r2_key, original_filename, content_type, size_bytes, sort_order 
                FROM draft_photos WHERE session_id = ? ORDER BY sort_order ASC`)
      .bind(sessionId)
      .all<{ id: string; r2_key: string; original_filename: string; content_type: string; size_bytes: number; sort_order: number }>();

    if (!draftPhotos || draftPhotos.length === 0) {
      return json({ error: "No photos found. Please upload photos first." }, 400);
    }

    const stmts: D1PreparedStatement[] = [];

    // 4. 【修正】插入 Submissions 语句（删除了不存在的 session_id 列）
    // 注意：我们将 submissionId 与 session 的关联关系放在业务层或通过 photos 表关联
    stmts.push(
      env.DB.prepare(`
        INSERT INTO submissions (
          id, work_title, episode, 
          name_kanji, name_kana, pen_name, email, phone, 
          agreed_terms, status, created_at_ms, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'submitted', ?, ?)
      `).bind(
        submissionId, 
        body.work_title, 
        body.episode,
        body.name_kanji, 
        body.name_kana, 
        normalizeOptionalString(body.pen_name),
        body.email, 
        body.phone, 
        now, 
        now
      )
    );

    // 5. 插入照片及变体
    for (const d of draftPhotos) {
      const photoId = crypto.randomUUID();
      const meta = perPhotoMeta.get(d.sort_order);

      stmts.push(
        env.DB.prepare(`
          INSERT INTO photos (
            id, submission_id, original_filename, draft_photo_id,
            shoot_date, shoot_location, caption, sort_order, status, created_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).bind(
          photoId, submissionId, d.original_filename, d.id,
          normalizeOptionalString(meta?.shoot_date),
          normalizeOptionalString(meta?.shoot_location),
          normalizeOptionalString(meta?.caption),
          d.sort_order, now
        )
      );

      stmts.push(
        env.DB.prepare(`
          INSERT INTO photo_variants (
            id, photo_id, kind, r2_key, content_type, size_bytes, is_ready, generated_at_ms, created_at_ms
          ) VALUES (?, ?, 'original', ?, ?, ?, 1, ?, ?)
        `).bind(
          crypto.randomUUID(), photoId, d.r2_key, d.content_type || null, d.size_bytes || null, now, now
        )
      );
    }

    // 6. 最后更新 Session 状态
    stmts.push(
      env.DB.prepare(`
        UPDATE upload_sessions 
        SET state = 'committed', updated_at_ms = ? 
        WHERE id = ? AND state = 'open'
      `).bind(now, sessionId)
    );

    // 执行批量事务
    const results = await env.DB.batch(stmts);

    // 验证最后一条更新是否成功
    const lastResult = results[results.length - 1];
    // @ts-ignore
    const changes = (lastResult?.meta?.changes ?? lastResult?.changes ?? 0) as number;
    
    if (changes === 0) {
      throw new Error("Session state conflict: already committed");
    }

    return json({ success: true, submissionId }, 201);

  } catch (err: any) {
    console.error("Submit API Error:", err);
    // 事务回滚后，session 状态自动保持为 open
    return json({ error: err?.message || "Internal Server Error" }, 500);
  }
}