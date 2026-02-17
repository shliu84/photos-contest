// 如果你有 Env 类型，就从你项目里引入；没有也可以先用 any
// import type { Env } from "../../src/types";

type Env = {
  DB: D1Database;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");

  return new Response(resp.body, {
    status: resp.status,
    headers,
  });
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  // 预检
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }));
  }

  // 这个文件天然只会匹配 /api/submit
  if (request.method !== "POST") {
    return withCors(json({ error: "Method Not Allowed" }, 405));
  }

  try {
    const body: any = await request.json();

    if (!body.name || !body.email || !Array.isArray(body.photos) || body.photos.length === 0) {
      return withCors(json({ error: "Missing required fields" }, 400));
    }

    const db = env.DB;
    if (!db) {
      return withCors(json({ error: "Missing D1 binding: DB" }, 500));
    }

    const submissionId = crypto.randomUUID();
    const createdAt = Date.now();

    const statements: D1PreparedStatement[] = [];

    statements.push(
      db
        .prepare(
          `INSERT INTO submissions
           (id, name, email, phone, agreed_terms, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          submissionId,
          body.name,
          body.email,
          body.phone || "",
          body.agreed_terms ? 1 : 0,
          createdAt
        )
    );

    body.photos.forEach((photo: any, index: number) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO photos
             (id, submission_id, r2_key, original_filename, location, year, panda_name, description, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(),
            submissionId,
            photo.key,
            photo.originalName,
            photo.location || "",
            photo.year || "",
            photo.panda_name || "不明",
            photo.description || "",
            index
          )
      );
    });

    await db.batch(statements);

    return withCors(json({ success: true, submissionId }));
  } catch (err: any) {
    console.error(err);
    return withCors(json({ error: err?.message || "Internal Server Error" }, 500));
  }
}
