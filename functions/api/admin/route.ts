import { NextRequest, NextResponse } from 'next/server';

/**
 * 管理员获取投稿列表接口
 * GET /api/admin/submissions?page=1&limit=10&status=submitted
 */
export async function GET(request: NextRequest) {
  // 1. 获取环境变量 (Cloudflare D1 绑定)
  // 注意：在 Cloudflare 环境下，env 需通过 getRequestContext 或直接在 process.env 中获取
  // 取决于你的框架配置，这里以标准的 process.env 为例
  const DB = process.env.DB as any; 
  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

  // 2. 简易安全检查
  const adminKey = request.headers.get("x-admin-key");
  if (!ADMIN_SECRET || adminKey !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  // 3. 解析分页与筛选参数
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status'); // 状态过滤
  const offset = (page - 1) * limit;

  try {
    // 4. 构建 SQL 语句
    let whereClause = "";
    const queryParams: any[] = [];

    if (status) {
      whereClause = "WHERE status = ?";
      queryParams.push(status);
    }

    // 查询总数（用于分页计算）
    const countResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM submissions ${whereClause}`
    ).bind(...queryParams).first();
    
    const total = (countResult?.total as number) || 0;

    // 查询投稿主表
    const submissionsQuery = `
      SELECT * FROM submissions 
      ${whereClause} 
      ORDER BY created_at_ms DESC 
      LIMIT ? OFFSET ?
    `;
    const { results: submissions } = await DB.prepare(submissionsQuery)
      .bind(...queryParams, limit, offset)
      .all();

    // 5. 关联查询：手动聚合照片数据
    if (submissions && submissions.length > 0) {
      const submissionIds = submissions.map((s: any) => s.id);
      
      // 构建 IN (?, ?, ...) 占位符
      const placeholders = submissionIds.map(() => '?').join(',');
      
      // 查出这些投稿下的所有有效照片
      const { results: allPhotos } = await DB.prepare(
        `SELECT * FROM photos 
         WHERE submission_id IN (${placeholders}) 
         AND status = 'active'
         ORDER BY sort_order ASC`
      ).bind(...submissionIds).all();

      // 将照片匹配到对应的投稿对象中
      submissions.forEach((sub: any) => {
        sub.photos = allPhotos.filter((p: any) => p.submission_id === sub.id);
      });
    }

    // 6. 返回格式化数据
    return NextResponse.json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error: any) {
    console.error("D1 Query Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal Server Error",
      details: error.message 
    }, { status: 500 });
  }
}