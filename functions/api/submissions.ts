/**
 * @api {POST} /api/submission 提交投稿（保存投稿信息 + 照片元数据）
 * @apiName CreateSubmission
 * @apiGroup Submission
 *
 * @apiDescription
 * 前端完成 R2 直传后，将投稿表单信息与每张照片的元数据（包含 r2_key）以 JSON 提交到本接口。
 * 本接口只负责写入 D1：
 * - submissions 表：一条投稿记录（status 固定写入 'submitted'）
 * - photos 表：对应的多条照片记录（status 固定写入 'active'，sort_order 按数组顺序）
 *
 * ---
 * 🌐 CORS
 * - Access-Control-Allow-Origin: *
 * - Access-Control-Allow-Methods: POST, OPTIONS
 * - Access-Control-Allow-Headers: Content-Type
 *
 * ---
 * 📥 请求方法
 * - POST（仅支持 POST；OPTIONS 为 CORS 预检）
 *
 * ---
 * 📥 请求头（Headers）
 * | 名称          | 类型   | 必填 | 说明 |
 * |---------------|--------|------|------|
 * | Content-Type  | string | 是   | application/json |
 *
 * ---
 * 📥 请求体（JSON Body）
 * @apiParamExample {json} Request-Body:
 * {
 *   "work_title": "桜とパンダ",
 *   "episode": "上野で見た思い出",
 *   "name_kanji": "山田 太郎",
 *   "name_kana": "やまだ たろう",
 *   "email": "yamada@example.com",
 *   "phone": "090-1234-5678",
 *   "agreed_terms": 1,
 *
 *   "shoot_date": "2026-03-07",
 *   "shoot_location": "上野公園",
 *   "pen_name": "たろう",
 *
 *   "photos": [
 *     {
 *       "r2_key": "uploads/uuid_foo.jpg",
 *       "original_filename": "foo.jpg",
 *       "content_type": "image/jpeg",
 *       "size_bytes": 123456
 *     }
 *   ]
 * }
 *
 * 字段说明：
 * ✅ 必填字段
 * - work_title: string 作品标题
 * - episode: string 故事/说明
 * - name_kanji: string 姓名（汉字）
 * - name_kana: string 姓名（假名）【建议前端仍传，后端当前未强校验但会入库】
 * - email: string 邮箱
 * - phone: string 电话
 * - agreed_terms: number 必须为 1（表示同意条款；DB 存 0/1）
 * - photos: PhotoMeta[] 至少 1 张，最多 5 张
 *
 * PhotoMeta（每张照片）：
 * - r2_key: string 必填，来自 /api/upload-url 返回的 key
 * - original_filename: string 必填，原始文件名（用于 DB 记录）
 * - content_type?: string 选填，如 image/jpeg
 * - size_bytes?: number 选填，文件大小（字节）
 *
 * 选填字段：
 * - shoot_date?: string 拍摄日期（格式由前端约定，例如 YYYY-MM-DD）
 * - shoot_location?: string 拍摄地点
 * - pen_name?: string 笔名
 *
 * ---
 * ✅ 成功响应（201）
 * @apiSuccessExample {json} Created:
 * {
 *   "success": true,
 *   "submissionId": "b3f1c1a0-....-....",
 *   "message": "Submission saved successfully"
 * }
 *
 * ---
 * ❌ 失败响应
 *
 * @apiError (400) BadRequest 参数错误 / 校验失败 / JSON 解析失败
 * @apiErrorExample {json} MissingRequired:
 * { "error": "Missing required fields" }
 *
 * @apiErrorExample {json} TermsRequired:
 * { "error": "You must agree to the terms." }
 *
 * @apiErrorExample {json} MissingPhotos:
 * { "error": "Missing photos" }
 *
 * @apiErrorExample {json} TooManyPhotos:
 * { "error": "Too many photos (max 5)" }
 *
 * @apiErrorExample {json} PhotoMetaInvalid:
 * { "error": "Photo at index 0 is missing key or filename" }
 *
 * @apiError (405) MethodNotAllowed 非 POST 请求
 * @apiErrorExample {json} MethodNotAllowed:
 * { "error": "Method Not Allowed" }
 *
 * @apiError (500) InternalServerError 缺少 D1 绑定
 * @apiErrorExample {json} MissingD1:
 * { "error": "Missing D1 binding" }
 *
 * ---
 * 📝 行为与约束（后端实现细节）
 * - submissions.id：服务端生成 UUID
 * - photos.id：服务端为每张照片生成 UUID
 * - created_at_ms / updated_at_ms：服务端写入当前毫秒时间戳
 * - submissions.status：固定写入 'submitted'
 * - photos.status：固定写入 'active'
 * - photos.sort_order：按 photos 数组顺序（0~4）
 */


// functions/api/submission.ts

interface Env {
  DB: DB;
  // 注意：这个接口不再需要 BUCKET binding，因为上传已经在前端完成了
}

// 1. 定义前端传过来的 JSON 数据结构
interface PhotoMeta {
  r2_key: string;            // 必填：upload-url 生成的 key
  original_filename: string; // 必填：用于数据库记录
  content_type?: string;     // 选填
  size_bytes?: number;       // 选填
}

interface SubmissionBody {
  // --- 必填字段 ---
  work_title: string;
  episode: string;
  name_kanji: string;
  name_kana: string;
  email: string;
  phone: string;
  agreed_terms: number; // 数据库存的是 0/1

  // --- 选填字段 ---
  shoot_date?: string;
  shoot_location?: string;
  pen_name?: string;

  // --- 照片元数据列表 ---
  photos: PhotoMeta[];
}

// Helper: 统一返回 JSON
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
  });
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  // 1. CORS 预检
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  // 只允许 POST
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  if (!env.DB) {
    return json({ error: "Missing D1 binding" }, 500);
  }

  try {
    // ✅ 改动 1: 解析 JSON 而不是 FormData
    const body = await request.json<SubmissionBody>();

    // ===== 2. 字段校验 =====
    
    // 必填项检查
    if (!body.work_title || !body.episode || !body.name_kanji || !body.email || !body.phone) {
      return json({ error: "Missing required fields" }, 400);
    }

    // 条款检查
    if (body.agreed_terms !== 1) {
      return json({ error: "You must agree to the terms." }, 400);
    }

    // 图片检查
    if (!body.photos || !Array.isArray(body.photos) || body.photos.length === 0) {
      return json({ error: "Missing photos" }, 400);
    }
    if (body.photos.length > 5) {
      return json({ error: "Too many photos (max 5)" }, 400);
    }

    const submissionId = crypto.randomUUID();
    const now = Date.now(); // 毫秒时间戳

    const statements: D1PreparedStatement[] = [];

    // ===== 3. 准备 SQL: 插入 Submission =====
    // 注意：字段名需与你的 Schema 对应
    statements.push(
      env.DB.prepare(`
        INSERT INTO submissions (
          id, work_title, episode, shoot_date, shoot_location,
          name_kanji, name_kana, pen_name, email, phone,
          agreed_terms, status, created_at_ms, updated_at_ms
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, 'submitted', ?, ?
        )
      `).bind(
        submissionId,
        body.work_title,
        body.episode,
        body.shoot_date || null,
        body.shoot_location || null,
        body.name_kanji,
        body.name_kana,
        body.pen_name || null,
        body.email,
        body.phone,
        body.agreed_terms, // 传入 1
        now, // created_at_ms
        now  // updated_at_ms
      )
    );

    // ===== 4. 准备 SQL: 插入 Photos =====
    // ✅ 改动 2: 不再上传 R2，直接存入前端传来的 key
    body.photos.forEach((photo, index) => {
      // 安全检查
      if (!photo.r2_key || !photo.original_filename) {
        throw new Error(`Photo at index ${index} is missing key or filename`);
      }

      statements.push(
        env.DB.prepare(`
          INSERT INTO photos (
            id, submission_id, r2_key, original_filename,
            content_type, size_bytes, sort_order,
            status, created_at_ms
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            'active', ?
          )
        `).bind(
          crypto.randomUUID(),
          submissionId,
          photo.r2_key,            // 前端已经传好了
          photo.original_filename,
          photo.content_type || null,
          photo.size_bytes || null,
          index,                   // sort_order 0~4
          now
        )
      );
    });

    // ===== 5. 执行 D1 事务 =====
    await env.DB.batch(statements);

    return json({
      success: true,
      submissionId,
      message: "Submission saved successfully"
    }, 201);

  } catch (err: any) {
    console.error("Submit API Error:", err);
    // 区分 JSON 解析错误和其他错误
    return json({ error: err.message || "Internal Server Error" }, 400);
  }
}