/**
 * @api {POST} /api/upload-sessions 创建草稿上传会话
 * @apiName CreateUploadSession
 * @apiGroup Upload
 *
 * @apiDescription
 * 创建一次“表单草稿上传会话”，用于把上传的 draft_photos 归组到同一个 session_id。
 * 前端拿到 session_id 后，再调用 /api/upload-url?session_id=... 来获取每张图的上传签名。
 *
 * --- Request Body (JSON，可选)
 * { "email": "user@example.com", "ttl_ms": 86400000 }
 *
 * --- Success (201)
 * { "session_id": "uuid", "state": "open", "expires_at_ms": 1700000000000, "created_at_ms": 1699990000000 }
 * * =========================================================================
 * * @api {GET} /api/upload-sessions 获取草稿上传会话状态
 * @apiName GetUploadSession
 * @apiGroup Upload
 *
 * @apiDescription
 * 根据 session_id 获取对应上传会话的状态、有效期等信息。
 *
 * --- Request Query
 * ?session_id=uuid (必填)
 *
 * --- Success (200)
 * { "id": "uuid", "email": "user@example.com", "state": "open", "expires_at_ms": 1700000000000, ... }
 */

// 更新了允许的方法，包含 GET 和 POST
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(email: string) {
  // 足够用的轻量校验（不追求 RFC 完整性）
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  // 1. CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 2. 检查环境变量
  if (!env.DB) {
    return json({ error: "Missing env vars", missing: ["DB (D1 binding)"] }, 500);
  }

  // ==========================================
  // 处理 GET 请求：获取 Session 状态
  // ==========================================
  if (request.method === "GET") {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id")?.trim();

    if (!sessionId) {
      return json({ error: "Missing or invalid session_id parameter" }, 400);
    }

    try {
      const session = await env.DB
        .prepare(
          `SELECT id, email, state, expires_at_ms, created_at_ms, updated_at_ms 
           FROM upload_sessions 
           WHERE id = ?`
        )
        .bind(sessionId)
        .first();

      if (!session) {
        return json({ error: "Session not found" }, 404);
      }

      // 动态判断是否过期
      const now = Date.now();
      if (session.state === "open" && now > session.expires_at_ms) {
        session.state = "expired";
      }

      return json(session, 200);
    } catch (err) {
      console.error("DB Query Error:", err);
      return json({ error: "Database query failed" }, 500);
    }
  }

  // ==========================================
  // 处理 POST 请求：创建新的 Session
  // ==========================================
  if (request.method === "POST") {
    let body: any = null;
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
    } else if (ct.length > 0) {
      return json({ error: "Unsupported Content-Type (use application/json)" }, 415);
    }

    const email: string | null =
      body?.email != null && String(body.email).trim() !== ""
        ? String(body.email).trim()
        : null;

    if (email && !isValidEmail(email)) {
      return json({ error: "Invalid email" }, 400);
    }

    const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
    const ttlMsRaw = body?.ttl_ms;
    let ttlMs = DEFAULT_TTL_MS;

    if (ttlMsRaw != null) {
      const n = Number(ttlMsRaw);
      const MIN = 5 * 60 * 1000;
      const MAX = 7 * 24 * 60 * 60 * 1000;

      if (!Number.isFinite(n) || !Number.isInteger(n) || n < MIN || n > MAX) {
        return json({ error: `Invalid ttl_ms (must be integer ${MIN}..${MAX})` }, 400);
      }
      ttlMs = n;
    }

    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const expiresAt = now + ttlMs;

    try {
      await env.DB
        .prepare(
          `INSERT INTO upload_sessions (
             id, email, state, expires_at_ms, created_at_ms, updated_at_ms
           ) VALUES (?, ?, 'open', ?, ?, ?)`
        )
        .bind(sessionId, email, expiresAt, now, now)
        .run();

      return json(
        {
          session_id: sessionId,
          state: "open",
          expires_at_ms: expiresAt,
          created_at_ms: now,
        },
        201
      );
    } catch (err) {
      console.error("DB Insert Error:", err);
      return json({ error: "Failed to create session in database" }, 500);
    }
  }

  // 如果既不是 GET 也不是 POST，返回 405
  return json({ error: "Method Not Allowed" }, 405);
}