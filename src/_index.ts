import { AwsClient } from "aws4fetch";

// 这里的 Env 定义只是为了让编辑器有代码提示
// 实际上运行时，Cloudflare 会自动把 ASSETS 塞进来
interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
  DB: D1Database;
  ASSETS: Fetcher; // <--- 这是一个系统自带的隐藏功能，必须声明
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  // 这里的 env 参数，就是 Cloudflare 运行时传进来的大管家
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ============================================================
    // 1. 处理 API 请求 (只拦截 /api 相关的路径)
    // ============================================================
    // 只要路径里包含 /upload-url 或者 /submit，我们就认为是 API
    if (url.pathname.includes("/upload-url") || url.pathname.includes("/submit")) {
        
        // --- 处理 CORS 预检 ---
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders });
        }

        // --- API: 获取上传链接 ---
        if (url.pathname.includes("/upload-url")) {
          const filename = url.searchParams.get("filename");
          if (!filename) return new Response(JSON.stringify({ error: "Missing filename" }), { status: 400, headers: corsHeaders });
          
          if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
             return new Response(JSON.stringify({ error: "Missing R2 credentials" }), { status: 500, headers: corsHeaders });
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

          return new Response(JSON.stringify({ url: signedUrl.url, key }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }

        // --- API: 提交表单 ---
        if (url.pathname.includes("/submit") && request.method === "POST") {
          try {
            const formData: any = await request.json();
            
            if (!formData.name || !formData.email || !formData.photos) {
               return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
            }

            const db = env.DB;
            const submissionId = crypto.randomUUID();
            const timestamp = Date.now();
            const statements = [];

            // 1. 插入 submission
            statements.push(db.prepare(
              `INSERT INTO submissions (id, name, email, phone, agreed_terms, created_at) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(submissionId, formData.name, formData.email, formData.phone || "", formData.agreed_terms ? 1 : 0, timestamp));

            // 2. 插入 photos
            for (const photo of formData.photos) {
              statements.push(db.prepare(
                `INSERT INTO photos (id, submission_id, r2_key, original_filename, location, year, panda_name, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              ).bind(crypto.randomUUID(), submissionId, photo.key, photo.originalName, photo.location, photo.year, photo.panda_name || "不明", photo.description, photo.index));
            }

            await db.batch(statements);
            return new Response(JSON.stringify({ success: true, submissionId }), { 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });

          } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
          }
        }
    }

    // ============================================================
    // 2. 【关键】如果不是 API，就放行去加载 React 页面
    // ============================================================
    // 这句话的意思是："Worker 处理不了这个请求，把它交给静态资源服务器吧"
    // 这里的 ASSETS 是 Cloudflare 自动提供的，不需要你在 .dev.vars 里配置
    return env.ASSETS.fetch(request);
  },
};