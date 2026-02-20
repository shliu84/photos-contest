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
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function toIntOrNull(v: string | null) {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return json({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return json({ error: "Missing env vars", missing: ["DB (D1 binding)"] }, 500);
  }

  const u = new URL(request.url);

  // v4：必须带 session_id，用于写入 stored_images 并归组
  const sessionId = u.searchParams.get("session_id")?.trim();
  const filename = u.searchParams.get("filename")?.trim();

  if (!sessionId) return json({ error: "Missing session_id" }, 400);
  if (!filename) return json({ error: "Missing filename" }, 400);

  // 可选元数据（不传则 NULL）
  const contentType = u.searchParams.get("content_type")?.trim() || null;
  const sizeBytes = toIntOrNull(u.searchParams.get("size_bytes"));
  const rotation = toIntOrNull(u.searchParams.get("rotation")); // 建议前端只传 0/90/180/270
  const sortOrderRaw = toIntOrNull(u.searchParams.get("sort_order")); // 0..4
  const sortOrder = sortOrderRaw == null ? 0 : sortOrderRaw;

  if (sortOrder < 0 || sortOrder > 4) {
    return json({ error: "Invalid sort_order (must be 0..4)" }, 400);
  }
  if (rotation != null && ![0, 90, 180, 270].includes(rotation)) {
    return json({ error: "Invalid rotation (must be 0, 90, 180, 270)" }, 400);
  }
  if (sizeBytes != null && sizeBytes < 0) {
    return json({ error: "Invalid size_bytes (must be >= 0)" }, 400);
  }

  // 必要 R2 环境变量
  const missing: string[] = [];
  if (!env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  if (missing.length) {
    return json({ error: "Missing R2 env vars", missing }, 500);
  }

  // 1) 校验 session
  const session = await env.DB
    .prepare(
      `SELECT id, state, expires_at_ms
       FROM upload_sessions
       WHERE id = ?`
    )
    .bind(sessionId)
    .first();

  if (!session) return json({ error: "Session not found" }, 404);

  const now = Date.now();
  if (session.state === "open" && now > session.expires_at_ms) {
    await env.DB
      .prepare(`UPDATE upload_sessions SET state='expired' WHERE id=? AND state='open'`)
      .bind(sessionId)
      .run();
    return json({ error: "Session expired" }, 410);
  }
  if (session.state !== "open") {
    return json({ error: `Session not open (state=${session.state})` }, 409);
  }

  // 2) 生成对象 key + 签名
  const r2 = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    region: "auto",
    service: "s3",
  });

  const uniqueId = crypto.randomUUID();
  const key = `uploads/${uniqueId}_${safeFilename(filename)}`;
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const objectUrl = `${endpoint}/${env.R2_BUCKET_NAME}/${key}`;
  // ✅ 过期时间放到 query
  // const url = new URL(objectUrl);
  // url.searchParams.set("X-Amz-Expires", "600"); // 10 分钟

  const signed = await r2.sign(objectUrl, {
    method: "PUT",
    // awsDate: new Date(),
    // expires: 600,
    // 如果你希望前端一定带 Content-Type，必须把它也纳入签名：
    // headers: contentType ? { "content-type": contentType } : undefined,
  });

  // 3) 写入 stored_images（对象层记录）
  const storedImageId = crypto.randomUUID();

  await env.DB
    .prepare(
      `INSERT INTO stored_images (
         id, session_id, r2_key,
         original_filename, content_type, size_bytes,
         rotation, sort_order, status,
         created_at_ms
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
    )
    .bind(
      storedImageId,
      sessionId,
      key,
      filename,
      contentType,
      sizeBytes,
      rotation,
      sortOrder,
      now
    )
    .run();

  // 4) 返回签名信息 + stored_image_id（关键：前端后续可用于确认/排序/删除等）
  return json({
    url: signed.url,
    key,
    stored_image_id: storedImageId,
    method: "PUT",
    expires_in: 600,
    headers: Object.fromEntries(signed.headers.entries()),
  });
}