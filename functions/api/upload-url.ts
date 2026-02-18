/**
 * @api {GET} /api/upload-url 获取 R2 直传签名信息（PUT + Signed Headers）
 * @apiName GetUploadUrlWithHeaders
 * @apiGroup Upload
 *
 * @apiDescription
 * 生成 Cloudflare R2（S3 兼容）直传所需的签名信息。
 * 与“返回带 ?X-Amz-... 的预签名 URL”不同：此接口可能返回**不带 query 的 url**，签名信息放在 `headers` 中。
 * 前端必须用返回的 `method` + `url` + `headers` 发起 PUT 上传。
 *
 * ---
 * ✅ 用法流程（前端）
 * 1) GET /api/upload-url?filename=xxx.jpg  → 得到 { url, key, method, headers, expires_in }
 * 2) PUT {url}
 *    - Body: 文件二进制
 *    - Headers: 合并返回的 headers（Authorization / x-amz-date / x-amz-content-sha256 等）
 * 3) 保存 key（用于后续写入 DB / 绑定 submission / 生成访问链接）
 *
 * ---
 * 🌐 CORS
 * - Access-Control-Allow-Origin: *
 * - Access-Control-Allow-Methods: GET, OPTIONS
 * - Access-Control-Allow-Headers: Content-Type
 *
 * ---
 * 📥 Query Parameters
 * | 参数名    | 类型   | 必填 | 说明 |
 * |----------|--------|------|------|
 * | filename | string | 是   | 原始文件名（服务端会做安全替换，并自动加 UUID 防冲突） |
 *
 * ---
 * 📤 成功响应（200）
 * @apiSuccessExample {json} Success-Response:
 * {
 *   "url": "https://<account>.r2.cloudflarestorage.com/<bucket>/uploads/<uuid>_xxx.jpg",
 *   "key": "uploads/<uuid>_xxx.jpg",
 *   "method": "PUT",
 *   "expires_in": 600,
 *   "headers": {
 *     "authorization": "AWS4-HMAC-SHA256 Credential=..., SignedHeaders=..., Signature=...",
 *     "x-amz-date": "20260308T010203Z",
 *     "x-amz-content-sha256": "UNSIGNED-PAYLOAD"
 *   }
 * }
 *
 * 字段说明：
 * - url: 目标对象地址（可能不带 query，这是正常的）
 * - key: R2 对象 Key（建议保存到数据库）
 * - method: 固定为 "PUT"
 * - expires_in: 签名有效期（秒），当前为 600
 * - headers: PUT 时必须携带的签名请求头（大小写可能因运行时不同而不同，按返回内容原样带上）
 *
 * ---
 * ❌ 失败响应
 *
 * @apiError (400) BadRequest 缺少 filename
 * @apiErrorExample {json} MissingFilename:
 * { "error": "Missing filename" }
 *
 * @apiError (405) MethodNotAllowed 非 GET 请求
 * @apiErrorExample {json} MethodNotAllowed:
 * { "error": "Method Not Allowed" }
 *
 * @apiError (500) InternalServerError 缺少 R2 环境变量
 * @apiErrorExample {json} MissingEnv:
 * {
 *   "error": "Missing R2 env vars",
 *   "missing": ["R2_ACCOUNT_ID", "R2_BUCKET_NAME"]
 * }
 *
 * ---
 * 📝 约束与实现细节
 * - key 格式：uploads/{uuid}_{safeFilename(filename)}
 * - safeFilename：将非 [a-zA-Z0-9.-] 字符替换为 "_"
 * - 签名有效期：600 秒
 *
 * ---
 * ⚠️ 前端注意事项
 * - 上传时请使用 `PUT`，并将返回的 `headers` 合并到请求头中
 * - 如需传 Content-Type，可能会影响签名：建议要么不传，要么在后端签名时也固定包含该头
 * - 浏览器直传可能触发 CORS：R2 Bucket/域名侧也需要允许对应方法与头（Authorization / x-amz-*）
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
  if (!filename) return json({ error: "Missing filename" }, 400);

  // 必要环境变量检查
  const missing: string[] = [];
  if (!env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  if (missing.length) {
    return json({ error: "Missing R2 env vars", missing }, 500);
  }

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

  // ⚠️ 关键点：
  // 这一行签出来的可能是“headers 鉴权”，url 本身不一定会带 ?X-Amz-...
  const signed = await r2.sign(objectUrl, {
    method: "PUT",
    awsDate: new Date(),
    expires: 600,
  });

  // ✅ 返回：
  // - url: 目标对象地址（可能不带 query，这是正常的）
  // - headers: PUT 时必须带的签名头（Authorization / x-amz-date / x-amz-content-sha256 等）
  return json({
    url: signed.url,
    key,
    method: "PUT",
    expires_in: 600,
    headers: Object.fromEntries(signed.headers.entries()),
  });
}
