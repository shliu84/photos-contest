import { AwsClient } from "aws4fetch";

interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  DB: D1Database;
  // 注意：Pages 不需要 ASSETS 了
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  // 你的接口都要跨域的话保留；如果只给同域前端用，建议改成你的域名
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function onRequest(context: { request: Request; env: Env; params: any }) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 只处理 /api 下的请求（因为这个文件本来就挂在 /api）
  // /api/upload-url
  // /api/submit

  // --- 处理 CORS 预检 ---
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ===== API: 获取上传链接 =====
  if (url.pathname.endsWith("/api/upload-url")) {
    const filename = url.searchParams.get("filename");
    if (!filename) return json({ error: "Missing filename" }, { status: 400 });

    if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      return json({ error: "Missing R2 credentials" }, { status: 500 });
    }

    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: "auto",
      service: "s3",
    });

    const uniqueId = crypto.randomUUID();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${uniqueId}_${safeFilename}`;
    const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const signedUrl = await r2.sign(`${endpoint}/${env.R2_BUCKET_NAME}/${key}`, {
      method: "PUT",
      awsDate: new Date(),
      expires: 600,
    });

    return json({ url: signedUrl.url, key });
  }

  // ===== API: 提交表单 =====
  if (url.pathname.endsWith("/api/submit") && request.method === "POST") {
    try {
      const formData: any = await request.json();

      if (!formData.name || !formData.email || !formData.photos) {
        return json({ error: "Missing required fields" }, { status: 400 });
      }

      const db = env.DB;
      const submissionId = crypto.randomUUID();
      const timestamp = Date.now();
      const statements: D1PreparedStatement[] = [];

      statements.push(
        db
          .prepare(
            `INSERT INTO submissions (id, name, email, phone, agreed_terms, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            submissionId,
            formData.name,
            formData.email,
            formData.phone || "",
            formData.agreed_terms ? 1 : 0,
            timestamp
          )
      );

      for (const photo of formData.photos) {
        statements.push(
          db
            .prepare(
              `INSERT INTO photos (id, submission_id, r2_key, original_filename, location, year, panda_name, description, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              crypto.randomUUID(),
              submissionId,
              photo.key,
              photo.originalName,
              photo.location,
              photo.year,
              photo.panda_name || "不明",
              photo.description,
              photo.index
            )
        );
      }

      await db.batch(statements);
      return json({ success: true, submissionId });
    } catch (err: any) {
      return json({ error: err?.message ?? "Unknown error" }, { status: 500 });
    }
  }

  // 其他 /api 路径：404
  return json({ error: "Not Found" }, { status: 404 });
}
