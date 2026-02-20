type Env = {
  DB: DB;
  BUCKET: BUCKET;
  ADMIN_TOKEN?: string; // 可选：简单鉴权
};

function withCors(resp: Response) {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(resp.body, { status: resp.status, headers });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function requireAdmin(request: Request, env: Env) {
  // 最简鉴权：Authorization: Bearer <token>
  // 你也可以先不设 token（不安全，只建议本地用）
  const token = env.ADMIN_TOKEN;
  if (!token) return; // 未配置则不校验（仅建议本地）
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${token}`) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function parseIntSafe(v: string | null, fallback: number) {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  try {
    const url = new URL(request.url);

    // 预检（可选）
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    // 只做 GET
    if (request.method !== "GET") return withCors(json({ error: "Method Not Allowed" }, 405));

    // 简单鉴权（建议生产开启）
    requireAdmin(request, env);

    const db = env.DB;
    if (!db) return withCors(json({ error: "Missing D1 binding: DB" }, 500));

    // 1) 页面：/admin
    if (url.pathname === "/admin") {
      return html(`
<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>后台查看（D1）</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system; margin: 16px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    input, select, button { padding: 8px 10px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
    th { background: #f7f7f7; text-align: left; }
    .muted { color: #666; font-size: 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; font-size: 12px; }
    .pill { padding: 2px 8px; border-radius: 999px; background: #eee; display: inline-block; }
  </style>
</head>
<body>
  <h2>后台查看（D1）</h2>
  <div class="muted">
    默认读取 /admin/api/submissions 和 /admin/api/photos。若你配置了 ADMIN_TOKEN，需要在请求头里带 Authorization: Bearer &lt;token&gt;。
  </div>

  <div class="row" style="margin-top:12px;">
    <label>搜索（作品/邮箱/姓名）： <input id="q" placeholder="例如: test@example.com" /></label>
    <label>每页：
      <select id="limit">
        <option>10</option><option>20</option><option>50</option><option>100</option>
      </select>
    </label>
    <button id="load">加载 submissions</button>
  </div>

  <div id="submissionsWrap"></div>

  <hr style="margin: 20px 0;" />

  <div class="row">
    <label>按 submission_id 查看 photos： <input id="sid" class="mono" style="min-width:360px;" placeholder="粘贴 submissionId" /></label>
    <button id="loadPhotos">加载 photos</button>
  </div>

  <div id="photosWrap"></div>

<script>
  // 如果你设置了 ADMIN_TOKEN，把 token 填到这里（或改成从 localStorage 读取）
  const ADMIN_TOKEN = ""; // e.g. "xxxx"
  function headers() {
    const h = {};
    if (ADMIN_TOKEN) h["Authorization"] = "Bearer " + ADMIN_TOKEN;
    return h;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function loadSubmissions() {
    const q = document.getElementById("q").value.trim();
    const limit = document.getElementById("limit").value;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("limit", limit);

    const res = await fetch("/admin/api/submissions?" + params.toString(), { headers: headers() });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById("submissionsWrap").innerHTML = "<pre>" + esc(JSON.stringify(data, null, 2)) + "</pre>";
      return;
    }

    const rows = data.rows || [];
    let html = "<h3>submissions（" + rows.length + "）</h3>";
    html += '<table><thead><tr>' +
      '<th>created_at</th><th>id</th><th>work_title</th><th>episode</th>' +
      '<th>name</th><th>email</th><th>phone</th><th>agreed</th><th>操作</th>' +
      '</tr></thead><tbody>';

    for (const r of rows) {
      const created = r.created_at ? new Date(Number(r.created_at)).toLocaleString() : "";
      html += "<tr>" +
        "<td class='muted'>" + esc(created) + "</td>" +
        "<td class='mono'>" + esc(r.id) + "</td>" +
        "<td>" + esc(r.work_title) + "</td>" +
        "<td>" + esc(r.episode) + "</td>" +
        "<td>" + esc((r.name_kanji || "") + " / " + (r.name_kana || "")) + "</td>" +
        "<td>" + esc(r.email) + "</td>" +
        "<td>" + esc(r.phone) + "</td>" +
        "<td>" + (r.agreed_terms ? "<span class='pill'>yes</span>" : "<span class='pill'>no</span>") + "</td>" +
        "<td><button onclick='fillSid(\"" + esc(r.id) + "\")'>查看 photos</button></td>" +
      "</tr>";
    }
    html += "</tbody></table>";
    document.getElementById("submissionsWrap").innerHTML = html;
  }

  window.fillSid = (sid) => {
    document.getElementById("sid").value = sid;
    loadPhotos();
  };

  async function loadPhotos() {
    const sid = document.getElementById("sid").value.trim();
    if (!sid) {
      document.getElementById("photosWrap").innerHTML = "<div class='muted'>请先填 submission_id</div>";
      return;
    }
    const res = await fetch("/admin/api/photos?submission_id=" + encodeURIComponent(sid), { headers: headers() });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById("photosWrap").innerHTML = "<pre>" + esc(JSON.stringify(data, null, 2)) + "</pre>";
      return;
    }
    const rows = data.rows || [];
    let html = "<h3>photos（" + rows.length + "）</h3>";
    html += "<table><thead><tr><th>sort</th><th>id</th><th>r2_key</th><th>filename</th><th>type</th><th>size</th></tr></thead><tbody>";
    for (const r of rows) {
      html += "<tr>" +
        "<td>" + esc(r.sort_order) + "</td>" +
        "<td class='mono'>" + esc(r.id) + "</td>" +
        "<td class='mono'>" + esc(r.r2_key) + "</td>" +
        "<td>" + esc(r.original_filename) + "</td>" +
        "<td class='muted'>" + esc(r.content_type) + "</td>" +
        "<td class='muted'>" + esc(r.size_bytes) + "</td>" +
      "</tr>";
    }
    html += "</tbody></table>";
    document.getElementById("photosWrap").innerHTML = html;
  }

  document.getElementById("load").addEventListener("click", loadSubmissions);
  document.getElementById("loadPhotos").addEventListener("click", loadPhotos);

  // 默认加载一次
  loadSubmissions();
</script>

</body>
</html>
      `);
    }

    // 2) API：/admin/api/submissions?q=xxx&limit=20&offset=0
    if (url.pathname === "/admin/api/submissions") {
      const q = (url.searchParams.get("q") || "").trim();
      const limit = Math.min(parseIntSafe(url.searchParams.get("limit"), 20) || 20, 200);
      const offset = parseIntSafe(url.searchParams.get("offset"), 0);

      // 允许搜索：work_title / email / name_kanji / name_kana / episode
      let stmt: D1PreparedStatement;
      if (q) {
        const like = `%${q}%`;
        stmt = db.prepare(
          `SELECT id, work_title, episode, shoot_date, shoot_location,
                  name_kanji, name_kana, pen_name, email, phone, agreed_terms, created_at
           FROM submissions
           WHERE work_title LIKE ? OR email LIKE ? OR name_kanji LIKE ? OR name_kana LIKE ? OR episode LIKE ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
        ).bind(like, like, like, like, like, limit, offset);
      } else {
        stmt = db.prepare(
          `SELECT id, work_title, episode, shoot_date, shoot_location,
                  name_kanji, name_kana, pen_name, email, phone, agreed_terms, created_at
           FROM submissions
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
        ).bind(limit, offset);
      }

      const res = await stmt.all();
      return withCors(json({ rows: res.results, limit, offset }));
    }

    // 3) API：/admin/api/photos?submission_id=xxx
    if (url.pathname === "/admin/api/photos") {
      const submissionId = (url.searchParams.get("submission_id") || "").trim();
      if (!submissionId) return withCors(json({ error: "Missing submission_id" }, 400));

      const res = await db.prepare(
        `SELECT id, submission_id, r2_key, original_filename, content_type, size_bytes, sort_order, created_at
         FROM photos
         WHERE submission_id = ?
         ORDER BY sort_order ASC`
      ).bind(submissionId).all();

      return withCors(json({ rows: res.results }));
    }

    return withCors(json({ error: "Not Found" }, 404));
  } catch (e: any) {
    const status = e?.status || 500;
    return withCors(json({ error: e?.message || "Internal Server Error" }, status));
  }
}
