import { AwsClient } from "aws4fetch";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  // CORS 预检
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ✅ 不要再判断 pathname 是否等于 /upload-url
  // 因为这个文件天然只处理 /api/upload-url
  const url = new URL(request.url);

  const filename = url.searchParams.get("filename");
  if (!filename) return json({ error: "Missing filename" }, 400);

  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) {
    return json({ error: "Missing R2 env vars" }, 500);
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
