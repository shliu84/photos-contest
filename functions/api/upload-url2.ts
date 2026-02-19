/**
 * @api {GET} /api/upload-url 获取 R2 直传签名信息（PUT + Signed Headers）+ 写入 D1 draft_photos
 * @apiName GetUploadUrlWithHeaders
 * @apiGroup Upload
 *
 * @apiDescription
 * 生成 Cloudflare R2（S3 兼容）直传所需的签名信息，并把本次上传登记到 D1 的 draft_photos 表。
 * 提交后才会从 draft_photos “commit”到 photos / photo_variants（不在本接口做）。
 *
 * --- ✅ 用法流程（前端）
 * 0) （推荐）先创建 upload_session，拿到 session_id（另一个接口做）
 * 1) GET /api/upload-url?session_id=...&sort_order=0&filename=xxx.jpg&content_type=image/jpeg&size_bytes=12345
 *    → 得到 { url, key, method, headers, expires_in }
 * 2) PUT {url}
 *    - Body: 文件二进制
 *    - Headers: 合并返回的 headers（authorization / x-amz-date / x-amz-content-sha256 等）
 *    - ⚠️ 建议：不要额外加 Content-Type（除非后端签名时也固定包含）
 * 3) 提交时，后端根据 session_id 从 D1 读取 draft_photos 并 commit
 *
 * --- 📥 Query Parameters
 * | 参数名       | 类型   | 必填 | 说明 |
 * |-------------|--------|------|------|
 * | session_id  | string | 是   | upload_sessions.id |
 * | sort_order  | number | 是   | 0~4；一个 session 最多 5 张 |
 * | filename    | string | 是   | 原始文件名（服务端会做安全替换，并自动加 UUID 防冲突） |
 * | content_type| string | 否   | 文件 MIME（写入 D1） |
 * | size_bytes  | number | 否   | 文件大小（写入 D1） |
 *
 * --- 📤 Success (200)
 * {
 *   "url": "https://<account>.r2.cloudflarestorage.com/<bucket>/draft_photos/<session>/<uuid>_xxx.jpg",
 *   "key": "draft_photos/<session>/<uuid>_xxx.jpg",
 *   "method": "PUT",
 *   "expires_in": 600,
 *   "headers": { ... }
 * }
 */

import { AwsClient } from "aws4fetch";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeFilename(name: string) {
  // 只保留 a-zA-Z0-9.-，其余替换为 _
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function parseIntStrict(v: string | null) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  return n;
}

function parseNonNegIntOrNull(v: string | null) {
  const n = parseIntStrict(v);
  if (n == null) return null;
  if (n < 0) return null;
  return n;
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  // CORS 预检
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const u = new URL(request.url);

  const filename = u.searchParams.get("filename");
  const sessionId = u.searchParams.get("session_id");
  const sortOrderStr = u.searchParams.get("sort_order");
  const contentType = u.searchParams.get("content_type") || null;
  const sizeBytesStr = u.searchParams.get("size_bytes");

  if (!filename) return json({ error: "Missing filename" }, 400);
  if (!sessionId) return json({ error: "Missing session_id" }, 400);

  const sortOrder = parseIntStrict(sortOrderStr);
  if (sortOrder == null || sortOrder < 0 || sortOrder > 4) {
    return json({ error: "Invalid sort_order (must be integer 0..4)" }, 400);
  }

  const sizeBytes = parseNonNegIntOrNull(sizeBytesStr);
  if (sizeBytesStr != null && sizeBytesStr !== "" && sizeBytes == null) {
    return json({ error: "Invalid size_bytes (must be integer >= 0)" }, 400);
  }

  // 必要环境变量检查
  const missing: string[] = [];
  if (!env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  if (!env.DB) missing.push("DB (D1 binding)");
  if (missing.length) {
    return json({ error: "Missing env vars", missing }, 500);
  }

  // 校验 upload_session 存在且 open、未过期
  const now = Date.now();
  const session = await env.DB
    .prepare(
      `SELECT id, state, expires_at_ms
       FROM upload_sessions
       WHERE id = ?`
    )
    .bind(sessionId)
    .first();

  if (!session) return json({ error: "Invalid session_id" }, 400);
  if (session.state !== "open") return json({ error: "Session not open" }, 409);
  if (now > session.expires_at_ms) return json({ error: "Session expired" }, 409);

  // 生成 R2 key：draft 前缀（推荐）
  const uniqueId = crypto.randomUUID();
  const key = `draft_photos/${sessionId}/${uniqueId}_${safeFilename(filename)}`;

  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const objectUrl = `${endpoint}/${env.R2_BUCKET_NAME}/${key}`;

  const r2 = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });

  // ⚠️ 注意：若前端 PUT 时额外加 Content-Type，可能会影响签名。
  // 最稳的做法：前端不要加 Content-Type，完全使用返回 headers。
  // 如果你一定要加 Content-Type，需要在 sign 时也把 Content-Type 固定纳入签名。
  const signed = await r2.sign(objectUrl, {
    method: "PUT",
    awsDate: new Date(),
    expires: 600,
    // 如果强制固定 Content-Type（可选）：
    // headers: contentType ? { "Content-Type": contentType } : undefined,
  });

  // 写入 D1：draft_photos upsert（按 session_id + sort_order 唯一）
  // 说明：
  // - 允许用户“同一 sort_order 重新选图”，直接覆盖旧记录
  // - created_at_ms 用 now（覆盖时也更新，表示最新一次选择）
  const draftPhotoId = crypto.randomUUID();

  await env.DB
    .prepare(
      `INSERT INTO draft_photos (
         id, session_id, r2_key, original_filename, content_type, size_bytes, sort_order, created_at_ms
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, sort_order)
       DO UPDATE SET
         r2_key=excluded.r2_key,
         original_filename=excluded.original_filename,
         content_type=excluded.content_type,
         size_bytes=excluded.size_bytes,
         created_at_ms=excluded.created_at_ms`
    )
    .bind(
      draftPhotoId,
      sessionId,
      key,
      filename,
      contentType,
      sizeBytes,
      sortOrder,
      now
    )
    .run();

  return json({
    url: signed.url,
    key,
    method: "PUT",
    expires_in: 600,
    headers: Object.fromEntries(signed.headers.entries()),
  });
}
