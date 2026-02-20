// functions/api/submissions2.ts



interface SubmissionBody {
  // NEW
  upload_session_id: string;

  // required
  work_title: string;
  episode: string;
  name_kanji: string;
  name_kana: string;
  email: string;
  phone: string;
  agreed_terms: number;

  // optional
  pen_name?: string;

  // optional defaults applied to each photo row
  shoot_date?: string;
  shoot_location?: string;
  caption?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  if (!env.DB) {
    return json({ error: "Missing D1 binding" }, 500);
  }

  try {
    const body = await request.json<SubmissionBody>();

    // Required checks
    if (
      !body.upload_session_id ||
      !body.work_title ||
      !body.episode ||
      !body.name_kanji ||
      !body.name_kana ||
      !body.email ||
      !body.phone
    ) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (body.agreed_terms !== 1) {
      return json({ error: "You must agree to the terms." }, 400);
    }

    const now = Date.now();
    const submissionId = crypto.randomUUID();

    // 1) Validate session is open & not expired
    const sessionRow = await env.DB.prepare(
      `SELECT id, state, expires_at_ms FROM upload_sessions WHERE id = ?`
    )
      .bind(body.upload_session_id)
      .first<{ id: string; state: "open" | "committed" | "expired"; expires_at_ms: number }>();

    if (!sessionRow) {
      return json({ error: "Invalid upload_session_id" }, 400);
    }
    if (sessionRow.state !== "open") {
      return json({ error: "Upload session is not open" }, 400);
    }
    if (sessionRow.expires_at_ms <= now) {
      return json({ error: "Upload session expired" }, 400);
    }

    // 2) Load draft photos (original only)
    const drafts = await env.DB.prepare(
      `SELECT id, r2_key, original_filename, content_type, size_bytes, sort_order
       FROM draft_photos
       WHERE session_id = ?
       ORDER BY sort_order ASC`
    )
      .bind(body.upload_session_id)
      .all<{
        id: string;
        r2_key: string;
        original_filename: string;
        content_type: string | null;
        size_bytes: number | null;
        sort_order: number;
      }>();

    const draftPhotos = drafts.results ?? [];

    if (draftPhotos.length === 0) {
      return json({ error: "Missing photos (no draft_photos found)" }, 400);
    }
    if (draftPhotos.length > 5) {
      return json({ error: "Too many photos (max 5)" }, 400);
    }

    // 3) Build statements (transaction style)
    const statements: D1PreparedStatement[] = [];

    statements.push(env.DB.prepare(`BEGIN`));

    // Insert submission (NOTE: v3.3 submissions has NO shoot_date/shoot_location columns)
    statements.push(
      env.DB.prepare(
        `INSERT INTO submissions (
          id, upload_session_id,
          work_title, episode,
          name_kanji, name_kana, pen_name, email, phone,
          agreed_terms, status, created_at_ms, updated_at_ms
        ) VALUES (
          ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, 'submitted', ?, ?
        )`
      ).bind(
        submissionId,
        body.upload_session_id,
        body.work_title,
        body.episode,
        body.name_kanji,
        body.name_kana,
        body.pen_name || null,
        body.email,
        body.phone,
        1,
        now,
        now
      )
    );

    // Insert photos + original variants
    for (const d of draftPhotos) {
      const photoId = crypto.randomUUID();

      statements.push(
        env.DB.prepare(
          `INSERT INTO photos (
            id, submission_id,
            original_filename, draft_photo_id,
            shoot_date, shoot_location, caption,
            sort_order, status, created_at_ms
          ) VALUES (
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, 'active', ?
          )`
        ).bind(
          photoId,
          submissionId,
          d.original_filename,
          d.id,
          body.shoot_date || null,
          body.shoot_location || null,
          body.caption || null,
          d.sort_order,
          now
        )
      );

      // Create ONLY original variant at commit time
      statements.push(
        env.DB.prepare(
          `INSERT INTO photo_variants (
            id, photo_id, kind,
            r2_key, content_type, size_bytes,
            width_px, height_px,
            is_ready, generated_at_ms,
            error_code, error_message,
            created_at_ms
          ) VALUES (
            ?, ?, 'original',
            ?, ?, ?,
            NULL, NULL,
            1, ?,
            NULL, NULL,
            ?
          )`
        ).bind(
          crypto.randomUUID(),
          photoId,
          d.r2_key,
          d.content_type || null,
          d.size_bytes || null,
          now,
          now
        )
      );
    }

    // Mark session committed
    statements.push(
      env.DB.prepare(
        `UPDATE upload_sessions
         SET state = 'committed', updated_at_ms = ?
         WHERE id = ? AND state = 'open'`
      ).bind(now, body.upload_session_id)
    );

    statements.push(env.DB.prepare(`COMMIT`));

    await env.DB.batch(statements);

    return json(
      {
        success: true,
        submissionId,
        message: "Submission saved successfully",
      },
      201
    );
  } catch (err: any) {
    console.error("Submit API Error:", err);
    // Best-effort rollback (if BEGIN succeeded but COMMIT didn't)
    try {
      await env.DB.prepare(`ROLLBACK`).run();
    } catch (_) {}

    return json({ error: err.message || "Internal Server Error" }, 400);
  }
}
