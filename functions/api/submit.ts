type Env = {
  DB: D1Database;
  BUCKET: R2Bucket; // ← 如果你的 R2 binding 不是 BUCKET，把这里改成实际名字
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");

  return new Response(resp.body, { status: resp.status, headers });
}

function mustString(form: FormData, key: string) {
  const v = form.get(key);
  if (typeof v !== "string" || !v.trim()) throw new Error(`Missing field: ${key}`);
  return v.trim();
}

function optString(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  // 预检
  if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  // 只允许 POST
  if (request.method !== "POST") return withCors(json({ error: "Method Not Allowed" }, 405));

  try {
    const db = env.DB;
    const bucket = env.BUCKET;
    if (!db) return withCors(json({ error: "Missing D1 binding: DB" }, 500));
    if (!bucket) return withCors(json({ error: "Missing R2 binding: BUCKET" }, 500));

    // ✅ 改这里：从 JSON 改成 FormData
    const form = await request.formData();

    // ===== 1) 读取表单字段（对应你重建后的 submissions 表）=====
    const work_title = mustString(form, "work_title");
    const episode = mustString(form, "episode");

    const shoot_date = optString(form, "shoot_date"); // YYYY-MM-DD（可选）
    const shoot_location = optString(form, "shoot_location"); // 可选

    const name_kanji = mustString(form, "name_kanji");
    const name_kana = mustString(form, "name_kana");
    const pen_name = optString(form, "pen_name");

    const email = mustString(form, "email");
    const phone = mustString(form, "phone");

    const agreed = form.get("agreed_terms");
    const agreed_terms = agreed === "true" || agreed === "on" ? 1 : 0;
    if (!agreed_terms) return withCors(json({ error: "You must agree to the terms." }, 400));

    // ===== 2) 读取图片（最多 5 张）=====
    const files = form.getAll("photos").filter((x): x is File => x instanceof File);

    // 如果你前端暂时还是单图 name="photo"，也兼容一下：
    const single = form.get("photo");
    if (single instanceof File) files.unshift(single);

    if (files.length === 0) return withCors(json({ error: "Missing photos" }, 400));
    if (files.length > 5) return withCors(json({ error: "Too many photos (max 5)" }, 400));

    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        return withCors(json({ error: `Invalid file type: ${f.name}` }, 400));
      }
    }

    const submissionId = crypto.randomUUID();
    const createdAt = Date.now();

    const statements: D1PreparedStatement[] = [];

    // ===== 3) 插入 submissions（表单所有字段）=====
    statements.push(
      db.prepare(
        `INSERT INTO submissions
         (id, work_title, episode, shoot_date, shoot_location,
          name_kanji, name_kana, pen_name, email, phone, agreed_terms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        submissionId,
        work_title,
        episode,
        shoot_date,
        shoot_location,
        name_kanji,
        name_kana,
        pen_name,
        email,
        phone,
        agreed_terms,
        createdAt
      )
    );

    // ===== 4) 上传到 R2 + 插入 photos =====
    for (let index = 0; index < files.length; index++) {
      const f = files[index];
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const key = `submissions/${submissionId}/${index + 1}-${crypto.randomUUID()}.${ext}`;

      await bucket.put(key, f.stream(), {
        httpMetadata: { contentType: f.type || "application/octet-stream" },
        customMetadata: { originalName: f.name },
      });

      statements.push(
        db.prepare(
          `INSERT INTO photos
           (id, submission_id, r2_key, original_filename, content_type, size_bytes, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          submissionId,
          key,
          f.name,
          f.type || "",
          f.size || 0,
          index,
          createdAt
        )
      );
    }

    // 一次性落库
    await db.batch(statements);

    return withCors(json({ success: true, submissionId }));
  } catch (err: any) {
    console.error(err);
    return withCors(json({ error: err?.message || "Internal Server Error" }, 500));
  }
}
