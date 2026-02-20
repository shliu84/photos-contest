const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function normPostalCode(pc: string) {
  return pc.replace(/\D/g, ""); // digits only
}

function isValidBirthDate(s: string) {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s);
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

export async function onRequest({ request, env }: { request: Request; env: any }) {
  // CORS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return json({ error: "Missing env vars", missing: ["DB (D1 binding)"] }, 500);
  }

  // Parse JSON
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return json({ error: "Unsupported Content-Type (use application/json)" }, 415);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Validate basics
  const uploadSessionId = String(body?.upload_session_id || "").trim();
  const workTitle = String(body?.work_title || "").trim();
  const workDescription = String(body?.work_description || "").trim();
  const agreedTerms = toInt(body?.agreed_terms);

  if (!uploadSessionId) return json({ error: "Missing upload_session_id" }, 400);
  if (!workTitle) return json({ error: "Missing work_title" }, 400);
  if (!workDescription) return json({ error: "Missing work_description" }, 400);
  if (agreedTerms !== 1) return json({ error: "agreed_terms must be 1" }, 400);

  const contacts = body?.contacts;
  if (!contacts || typeof contacts !== "object") {
    return json({ error: "Missing contacts" }, 400);
  }

  const requiredContactFields = [
    "last_name",
    "first_name",
    "last_name_kana",
    "first_name_kana",
    "gender",
    "birth_date",
    "email",
    "postal_code",
    "prefecture",
    "address_line1",
  ];

  for (const k of requiredContactFields) {
    if (!isNonEmptyString(contacts?.[k])) {
      return json({ error: `Missing contacts.${k}` }, 400);
    }
  }

  const gender = String(contacts.gender).trim();
  if (!["male", "female", "other"].includes(gender)) {
    return json({ error: "Invalid contacts.gender" }, 400);
  }

  const birthDate = String(contacts.birth_date).trim();
  if (!isValidBirthDate(birthDate)) {
    return json({ error: "Invalid contacts.birth_date (YYYY-MM-DD)" }, 400);
  }

  const email = String(contacts.email).trim();
  if (!isValidEmail(email)) {
    return json({ error: "Invalid contacts.email" }, 400);
  }

  const photos = Array.isArray(body?.photos) ? body.photos : null;
  if (!photos || photos.length === 0) {
    return json({ error: "Missing photos (must be non-empty array)" }, 400);
  }
  if (photos.length > 5) {
    return json({ error: "Too many photos (max 5)" }, 400);
  }

  // Validate photos payload + build normalized list
  const normalizedPhotos: Array<{
    stored_image_id: string;
    sort_order: number;
    photo_title: string | null;
    photo_description: string | null;
    shoot_date: string | null;
    shoot_location: string | null;
  }> = [];

  const usedSortOrders = new Set<number>();
  const usedStoredImageIds = new Set<string>();

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i] || {};
    const storedImageId = String(p.stored_image_id || "").trim();
    const sortOrder = toInt(p.sort_order);

    if (!storedImageId) return json({ error: `photos[${i}].stored_image_id is required` }, 400);
    if (sortOrder == null || sortOrder < 0 || sortOrder > 4) {
      return json({ error: `photos[${i}].sort_order must be integer 0..4` }, 400);
    }
    if (usedSortOrders.has(sortOrder)) {
      return json({ error: `Duplicate sort_order: ${sortOrder}` }, 400);
    }
    if (usedStoredImageIds.has(storedImageId)) {
      return json({ error: `Duplicate stored_image_id: ${storedImageId}` }, 400);
    }
    usedSortOrders.add(sortOrder);
    usedStoredImageIds.add(storedImageId);

    normalizedPhotos.push({
      stored_image_id: storedImageId,
      sort_order: sortOrder,
      photo_title: isNonEmptyString(p.photo_title) ? String(p.photo_title).trim() : null,
      photo_description: isNonEmptyString(p.photo_description) ? String(p.photo_description).trim() : null,
      shoot_date: isNonEmptyString(p.shoot_date) ? String(p.shoot_date).trim() : null,
      shoot_location: isNonEmptyString(p.shoot_location) ? String(p.shoot_location).trim() : null,
    });
  }

  const now = Date.now();

  // 1) Check upload session
  const session = await env.DB
    .prepare(`SELECT id, state, expires_at_ms FROM upload_sessions WHERE id = ?`)
    .bind(uploadSessionId)
    .first();

  if (!session) return json({ error: "Upload session not found" }, 404);

  if (session.state === "open" && now > session.expires_at_ms) {
    await env.DB
      .prepare(`UPDATE upload_sessions SET state='expired' WHERE id=? AND state='open'`)
      .bind(uploadSessionId)
      .run();
    return json({ error: "Upload session expired" }, 410);
  }
  if (session.state !== "open") {
    return json({ error: `Upload session not open (state=${session.state})` }, 409);
  }

  // 2) Load stored_images and validate ownership/status
  // Build placeholders for IN (...)
  const ids = normalizedPhotos.map((p) => p.stored_image_id);
  const placeholders = ids.map(() => "?").join(",");

  const storedRows = await env.DB
    .prepare(
      `SELECT id, session_id, r2_key, original_filename, content_type, size_bytes, rotation, sort_order, status, created_at_ms
       FROM stored_images
       WHERE id IN (${placeholders})`
    )
    .bind(...ids)
    .all();

  const storedList: any[] = storedRows?.results || [];
  if (storedList.length !== ids.length) {
    return json({ error: "Some stored_image_id not found" }, 400);
  }

  const storedById = new Map<string, any>();
  for (const r of storedList) storedById.set(r.id, r);

  for (const p of normalizedPhotos) {
    const r = storedById.get(p.stored_image_id);
    if (!r) return json({ error: "Some stored_image_id not found" }, 400);

    if (r.session_id !== uploadSessionId) {
      return json({ error: `stored_image does not belong to this session: ${r.id}` }, 409);
    }
    if (r.status !== "draft") {
      return json({ error: `stored_image is not draft: ${r.id}` }, 409);
    }
  }

  // 3) Prepare inserts
  const submissionId = crypto.randomUUID();

  const emailNorm = normEmail(email);
  const postalCode = String(contacts.postal_code).trim();
  const postalNorm = normPostalCode(postalCode);

  const batchStatements: any[] = [];

  // submissions
  batchStatements.push(
    env.DB.prepare(
      `INSERT INTO submissions (
         id, upload_session_id, work_title, work_description,
         agreed_terms, status, admin_note,
         created_at_ms, updated_at_ms
       ) VALUES (?, ?, ?, ?, ?, 'submitted', NULL, ?, ?)`
    ).bind(submissionId, uploadSessionId, workTitle, workDescription, 1, now, now)
  );

  // submission_contacts
  batchStatements.push(
    env.DB.prepare(
      `INSERT INTO submission_contacts (
         submission_id,
         last_name, first_name, last_name_kana, first_name_kana,
         pen_name,
         gender, birth_date,
         email, email_norm,
         postal_code, postal_code_norm,
         prefecture, address_line1, address_line2,
         phone, phone_norm,
         created_at_ms, updated_at_ms
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      submissionId,
      String(contacts.last_name).trim(),
      String(contacts.first_name).trim(),
      String(contacts.last_name_kana).trim(),
      String(contacts.first_name_kana).trim(),
      isNonEmptyString(contacts.pen_name) ? String(contacts.pen_name).trim() : null,
      gender,
      birthDate,
      email,
      emailNorm,
      postalCode,
      postalNorm,
      String(contacts.prefecture).trim(),
      String(contacts.address_line1).trim(),
      isNonEmptyString(contacts.address_line2) ? String(contacts.address_line2).trim() : null,
      isNonEmptyString(contacts.phone) ? String(contacts.phone).trim() : null,
      isNonEmptyString(contacts.phone) ? String(contacts.phone).replace(/\D/g, "") : null,
      now,
      now
    )
  );

  // photos + photo_variants(original) + stored_images.status update
  const createdPhotoSummaries: Array<{ photo_id: string; stored_image_id: string; sort_order: number }> = [];

  for (const p of normalizedPhotos) {
    const stored = storedById.get(p.stored_image_id);

    const photoId = crypto.randomUUID();
    createdPhotoSummaries.push({ photo_id: photoId, stored_image_id: p.stored_image_id, sort_order: p.sort_order });

    // photos row
    batchStatements.push(
      env.DB.prepare(
        `INSERT INTO photos (
           id, submission_id, stored_image_id,
           original_filename,
           photo_title, photo_description,
           shoot_date, shoot_location,
           sort_order,
           status,
           created_at_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      ).bind(
        photoId,
        submissionId,
        p.stored_image_id,
        String(stored.original_filename),
        p.photo_title,
        p.photo_description,
        p.shoot_date,
        p.shoot_location,
        p.sort_order,
        now
      )
    );

    // photo_variants: original (直接引用已上传对象)
    // - kind='original'
    // - r2_key = stored_images.r2_key
    // - is_ready=1
    const variantId = crypto.randomUUID();
    batchStatements.push(
      env.DB.prepare(
        `INSERT INTO photo_variants (
           id, photo_id, kind,
           r2_key, content_type, size_bytes,
           width_px, height_px,
           is_ready, generated_at_ms,
           error_code, error_message,
           created_at_ms
         ) VALUES (?, ?, 'original', ?, ?, ?, NULL, NULL, 1, ?, NULL, NULL, ?)`
      ).bind(
        variantId,
        photoId,
        String(stored.r2_key),
        stored.content_type ?? null,
        stored.size_bytes ?? null,
        now,
        now
      )
    );

    // stored_images status -> final
    batchStatements.push(
      env.DB.prepare(
        `UPDATE stored_images
         SET status='final'
         WHERE id=? AND status='draft'`
      ).bind(p.stored_image_id)
    );
  }

  // upload_sessions state -> committed
  batchStatements.push(
    env.DB.prepare(
      `UPDATE upload_sessions
       SET state='committed'
       WHERE id=? AND state='open'`
    ).bind(uploadSessionId)
  );

  // 4) Execute as a batch (transactional in D1)
  try {
    await env.DB.batch(batchStatements);

    return json(
      {
        submission_id: submissionId,
        status: "submitted",
        created_at_ms: now,
        photos: createdPhotoSummaries,
      },
      201
    );
  } catch (err) {
    console.error("Submission insert failed:", err);
    return json({ error: "Failed to create submission" }, 500);
  }
}