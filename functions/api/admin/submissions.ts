/**
 * @api {GET} /api/admin/submissions 管理端-获取投稿列表
 * @apiName GetAdminSubmissions
 * @apiGroup Admin
 *
 * @apiDescription
 * 管理后台接口，用于分页获取投稿列表，支持按投稿状态筛选。
 * 需要通过请求头传入管理员密钥进行鉴权。
 *
 * ---
 * 🔐 权限说明
 * - 仅管理员可访问
 * - 通过请求头 `x-admin-key` 校验
 *
 * ---
 * 📥 请求头（Headers）
 * | 名称           | 类型   | 是否必填 | 说明 |
 * |----------------|--------|----------|------|
 * | x-admin-key    | string | 是       | 管理员密钥 |
 *
 * ---
 * 📥 查询参数（Query Parameters）
 * | 参数名 | 类型   | 是否必填 | 默认值 | 说明 |
 * |-------|--------|----------|--------|------|
 * | page  | number | 否       | 1      | 页码（从 1 开始） |
 * | limit | number | 否       | 10     | 每页数量 |
 * | status| string | 否       | -      | 投稿状态筛选 |
 *
 * ---
 * 📤 成功响应（200）
 * @apiSuccessExample {json} Success-Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "status": "approved",
 *       "created_at_ms": 1700000000000,
 *       "photos": [
 *         {
 *           "id": 10,
 *           "submission_id": 1,
 *           "url": "https://example.com/photo.jpg",
 *           "sort_order": 1,
 *           "status": "active"
 *         }
 *       ]
 *     }
 *   ],
 *   "pagination": {
 *     "total": 100,
 *     "page": 1,
 *     "limit": 10,
 *     "totalPages": 10
 *   }
 * }
 *
 * ---
 * ❌ 失败响应
 *
 * @apiError (401) Unauthorized
 * @apiErrorExample {json} Unauthorized:
 * {
 *   "error": "Unauthorized: Invalid Admin Key"
 * }
 *
 * @apiError (500) InternalServerError
 * @apiErrorExample {json} ServerError:
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 *
 * ---
 * 📝 备注
 * - 投稿按 `created_at_ms` 倒序返回
 * - 每条投稿包含已关联的 `active` 状态照片列表
 */


import { DiscoverBehavior } from "react-router-dom";



/**
 * Cloudflare Pages Function: GET /api/admin/submissions
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const { searchParams } = new URL(request.url);

  // 1. 安全检查：校验前端传入的 Key
  const adminKey = request.headers.get("x-admin-key");
  if (!env.ADMIN_SECRET_KEY || adminKey !== env.ADMIN_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid Admin Key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. 解析分页与过滤参数
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const status = searchParams.get("status"); 
  const offset = (page - 1) * limit;

  try {
    const db = env.DB;

    // 3. 构建 SQL 条件
    let whereClause = "";
    const queryParams: any[] = [];
    if (status) {
      whereClause = "WHERE status = ?";
      queryParams.push(status);
    }

    // 4. 执行总数查询
    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM submissions ${whereClause}`)
      .bind(...queryParams)
      .first<{ total: number }>();
    
    const total = countResult?.total || 0;

    // 5. 查询投稿主表 (按毫秒时间戳倒序)
    const submissionsQuery = `
      SELECT * FROM submissions 
      ${whereClause} 
      ORDER BY created_at_ms DESC 
      LIMIT ? OFFSET ?
    `;
    const { results: submissions } = await db
      .prepare(submissionsQuery)
      .bind(...queryParams, limit, offset)
      .all();

    // 6. 关联查询照片 (D1 手动聚合)
    if (submissions && submissions.length > 0) {
      const submissionIds = submissions.map((s: any) => s.id);
      
      // 生成类似 "?, ?, ?" 的占位符
      const placeholders = submissionIds.map(() => "?").join(",");
      
      const { results: allPhotos } = await db
        .prepare(
          `SELECT * FROM photos 
           WHERE submission_id IN (${placeholders}) 
           AND status = 'active'
           ORDER BY sort_order ASC`
        )
        .bind(...submissionIds)
        .all();

      // 将照片数据映射到每一个 submission 对象中
      submissions.forEach((sub: any) => {
        sub.photos = allPhotos.filter((p: any) => p.submission_id === sub.id);
      });
    }

    // 7. 返回 JSON 响应
    return new Response(
      JSON.stringify({
        success: true,
        data: submissions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};