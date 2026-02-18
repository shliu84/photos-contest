import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Eye,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ==========================================
// Types
// ==========================================
type Status = 'pending' | 'approved' | 'rejected';

// 后端返回的 Photo（只有 r2_key）
type Photo = {
  id: string | number;
  submission_id: string | number;
  r2_key: string;
  sort_order?: number;
  status?: string;
};

// 后端返回的 Submission（按你 Postman 的字段）
type SubmissionApi = {
  id: string;
  work_title: string;
  episode?: string;
  shoot_date?: string;
  shoot_location?: string;
  name_kanji: string;
  name_kana?: string;
  pen_name?: string;
  email: string;
  phone?: string;
  agreed_terms?: number;
  status: string; // e.g. "submitted"
  admin_note?: string | null;
  created_at_ms?: number;
  updated_at_ms?: number;
  photos?: Photo[];
};

// 前端 UI 使用的 Submission（保持你原来的 UI 字段）
type Submission = {
  id: string;
  applicant: string;
  email: string;
  date?: string;
  created_at_ms?: number;
  status: Status;
  title: string;
  description: string;
  photos?: Photo[];
  tags?: string[];
};

type ApiResponse = {
  success: boolean;
  data: SubmissionApi[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  error?: string;
};

const StatusBadge = ({ status }: { status: Status }) => {
  const styles: Record<Status, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  const labels: Record<Status, string> = {
    pending: '審査中',
    approved: '採用',
    rejected: '不採用',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

function formatDate(ms?: number) {
  if (!ms) return '';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ✅ 你的 R2 公网基地址（bucket 前缀已经包含在内）
const R2_PUBLIC_BASE =
  'https://pub-53126c2046dd42889f441204e6e3cc12.r2.dev';

function buildR2Url(r2Key?: string) {
  if (!r2Key) return '';
  // 防止出现 //uploads 这种情况
  const key = r2Key.startsWith('/') ? r2Key.slice(1) : r2Key;
  return `${R2_PUBLIC_BASE}/${key}`;
}

function getCoverUrl(s: Submission) {
  // 优先 sort_order 最小的（如果没给 sort_order，就按数组顺序）
  const photos = s.photos ?? [];
  if (photos.length === 0) return '';
  const sorted = [...photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return buildR2Url(sorted[0]?.r2_key);
}

function toCsv(rows: Submission[]) {
  const header = ['id', 'date', 'status', 'title', 'applicant', 'email'];
  const escape = (v: any) => `"${String(v ?? '').replaceAll('"', '""')}"`;

  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [r.id, r.date || formatDate(r.created_at_ms), r.status, r.title, r.applicant, r.email]
        .map(escape)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 把后端 status 映射到前端 badge（你可以按实际业务改）
function mapStatus(apiStatus: string): Status {
  const s = (apiStatus || '').toLowerCase();
  if (s === 'approved' || s === 'accept' || s === 'accepted') return 'approved';
  if (s === 'rejected' || s === 'reject' || s === 'denied') return 'rejected';
  // 你的 "submitted" / "pending" / 其他 → 统一当 pending
  return 'pending';
}

// 把后端数据归一化为前端 UI 需要的字段
function normalizeSubmission(s: SubmissionApi): Submission {
  const title = s.work_title ?? '';
  const applicant = s.name_kanji ?? s.pen_name ?? '';
  const email = s.email ?? '';
  const date = s.shoot_date || formatDate(s.created_at_ms);

  // 你原 UI 用 description，这里拼一个可读描述（也可以换成 admin_note）
  const descParts = [
    s.episode ? `Episode: ${s.episode}` : '',
    s.shoot_location ? `Location: ${s.shoot_location}` : '',
    s.phone ? `Phone: ${s.phone}` : '',
    s.admin_note ? `Note: ${s.admin_note}` : '',
  ].filter(Boolean);
  const description = descParts.join(' / ') || '—';

  return {
    id: s.id,
    applicant,
    email,
    date,
    created_at_ms: s.created_at_ms,
    status: mapStatus(s.status),
    title,
    description,
    photos: s.photos ?? [],
  };
}

// ==========================================
// Main
// ==========================================
export default function AdminDashboard() {
  // ✅ 你可以改成从 env / localStorage 读取
  const API_BASE = ''; // 例如：https://your-domain.com
  // const ADMIN_KEY = (typeof window !== 'undefined' && localStorage.getItem('ADMIN_KEY')) || '';
  const ADMIN_KEY = 'your_super_secret';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const [filter, setFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========= Fetch =========
  useEffect(() => {
    let aborted = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(`${API_BASE}/api/admin/submissions`, window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', String(limit));
        if (filter !== 'all') url.searchParams.set('status', filter);

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': ADMIN_KEY,
          },
        });

        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.success) {
          throw new Error(json?.error || `Request failed: ${res.status}`);
        }

        if (aborted) return;

        const normalized = (json.data || []).map(normalizeSubmission);

        setSubmissions(normalized);
        setTotal(json.pagination?.total ?? 0);
        setTotalPages(json.pagination?.totalPages ?? 1);
      } catch (e: any) {
        if (aborted) return;
        setError(e?.message || 'Unknown error');
        setSubmissions([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      aborted = true;
    };
  }, [API_BASE, ADMIN_KEY, page, limit, filter]);

  // ========= Search filtering (client-side) =========
  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const hay = [s.id, s.title, s.applicant, s.email, s.description, s.date || '']
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [submissions, search]);

  // ========= Stats (based on current page data + total) =========
  const stats = useMemo(() => {
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const approved = submissions.filter((s) => s.status === 'approved').length;
    return { total, pending, approved };
  }, [submissions, total]);

  // ========= Handlers =========
  const onChangeFilter = (f: 'all' | Status) => {
    setFilter(f);
    setPage(1);
  };

  const exportCsv = () => {
    const csv = toCsv(filteredBySearch);
    const filename = `submissions_${filter}_${page}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
  };

  // 前端只做 UI 乐观更新；你有 PATCH 接口再接入即可
  const handleStatusChangeLocal = (id: string, newStatus: Status) => {
    setSubmissions((prev) => prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it)));
    if (selectedSubmission?.id === id) {
      setSelectedSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 text-gray-700 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-xl shadow-orange-100/40">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-orange-600 font-semibold text-xs">和華</span>
            </div>
            <span className="font-semibold text-lg tracking-wide text-gray-800">ADMIN</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl border border-orange-200"
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">投稿管理</span>
          </a>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-orange-50 rounded-xl transition-colors"
          >
            <ImageIcon size={20} />
            <span className="font-medium">ギャラリー</span>
          </a>

          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-orange-50 rounded-xl transition-colors"
          >
            <Download size={20} />
            <span className="font-medium">一括ダウンロード</span>
          </a>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors w-full hover:bg-orange-50 rounded-xl">
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-900">投稿一覧 (Submissions)</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-200" />
            <span className="text-sm text-gray-500">Admin User</span>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-orange-100/40">
              <p className="text-gray-500 text-sm mb-1">総投稿数</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-yellow-200 shadow-xl shadow-orange-100/40">
              <p className="text-yellow-700 text-sm mb-1">審査待ち (Pending)</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-green-200 shadow-xl shadow-orange-100/40">
              <p className="text-green-700 text-sm mb-1">採用済み (Approved)</p>
              <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onChangeFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm capitalize transition-colors border ${
                    filter === f
                      ? 'bg-orange-100 text-orange-800 border-orange-200 font-semibold'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="検索... (ID / 名前 / メール / タイトル)"
                  className="w-full md:w-80 bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                onClick={exportCsv}
                className="flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 shadow-lg shadow-orange-200/50 whitespace-nowrap disabled:opacity-60"
                disabled={filteredBySearch.length === 0}
              >
                <Download size={16} /> CSV出力
              </button>
            </div>
          </div>

          {/* Error / Loading */}
          {error && (
            <div className="mb-6 bg-white border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-xl shadow-orange-100/40">
              <AlertTriangle className="text-red-500 mt-0.5" size={18} />
              <div className="text-sm">
                <div className="font-semibold text-gray-900">読み込みに失敗しました</div>
                <div className="text-gray-600 break-all">{error}</div>
                <div className="text-gray-500 mt-2">
                  ヒント：`x-admin-key` が未設定/不一致の場合は 401 になります（localStorage の ADMIN_KEY を確認）。
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl shadow-orange-100/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">作品プレビュー</th>
                    <th className="px-6 py-4 font-semibold">投稿ID / 日時</th>
                    <th className="px-6 py-4 font-semibold">応募者情報</th>
                    <th className="px-6 py-4 font-semibold">タイトル</th>
                    <th className="px-6 py-4 font-semibold">ステータス</th>
                    <th className="px-6 py-4 font-semibold text-right">操作</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10">
                        <div className="flex items-center justify-center gap-3 text-gray-500">
                          <Loader2 className="animate-spin" size={18} />
                          読み込み中...
                        </div>
                      </td>
                    </tr>
                  ) : filteredBySearch.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        該当データがありません
                      </td>
                    </tr>
                  ) : (
                    filteredBySearch.map((item) => {
                      const cover = getCoverUrl(item);
                      return (
                        <tr key={item.id} className="hover:bg-orange-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div
                              className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:border-orange-300 transition-colors bg-gray-50 flex items-center justify-center"
                              onClick={() => setSelectedSubmission(item)}
                            >
                              {cover ? (
                                <img src={cover} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="text-gray-300" size={22} />
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-mono text-gray-900 mb-1">{item.id}</div>
                            <div className="text-xs text-gray-500">{item.date}</div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-gray-900 font-medium">{item.applicant}</div>
                            <div className="text-xs text-gray-500">{item.email}</div>
                          </td>

                          <td className="px-6 py-4 text-gray-900 max-w-xs truncate">{item.title}</td>

                          <td className="px-6 py-4">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setSelectedSubmission(item)}
                                className="p-2 hover:bg-orange-100 rounded-full text-gray-600"
                                title="詳細を見る"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  const url = getCoverUrl(item);
                                  if (url) downloadTextFile(`${item.id}.url.txt`, url);
                                }}
                                className="p-2 hover:bg-orange-100 rounded-full text-gray-600"
                                title="ダウンロード（URL）"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Page {page} / {totalPages} ・ Total {total}
              </span>
              <div className="flex gap-2 items-center">
                <button
                  className="p-1 hover:text-gray-900 disabled:opacity-50"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Prev"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="p-1 hover:text-gray-900 disabled:opacity-50"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedSubmission && (
        <DetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={() => {
            handleStatusChangeLocal(selectedSubmission.id, 'approved');
            setSelectedSubmission(null);
          }}
          onReject={() => {
            handleStatusChangeLocal(selectedSubmission.id, 'rejected');
            setSelectedSubmission(null);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Detail Modal (supports multi-photos) - r2_key only
// ==========================================
function DetailModal({
  submission,
  onClose,
  onApprove,
  onReject,
}: {
  submission: Submission;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const photos = submission.photos ?? [];

  // 默认取封面
  const initial = getCoverUrl(submission);
  const [activeUrl, setActiveUrl] = useState<string>(initial);

  useEffect(() => {
    setActiveUrl(initial);
  }, [initial]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col md:flex-row shadow-2xl shadow-orange-200/40">
        {/* Left */}
        <div className="md:w-1/2 bg-gray-50 flex flex-col p-4 relative">
          <div className="flex-1 flex items-center justify-center relative group">
            {activeUrl ? (
              <img src={activeUrl} alt={submission.title} className="max-h-[60vh] md:max-h-[80vh] object-contain" />
            ) : (
              <div className="text-gray-400 flex items-center gap-2">
                <ImageIcon size={18} /> No image
              </div>
            )}

            {activeUrl && (
              <a
                href={activeUrl}
                download
                className="absolute bottom-6 right-6 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border border-gray-200 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download size={16} /> 原図保存
              </a>
            )}
          </div>

          {/* Thumbs */}
          {photos.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {photos
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((p) => {
                  const url = buildR2Url(p.r2_key);
                  if (!url) return null;
                  const active = url === activeUrl;
                  return (
                    <button
                      key={String(p.id)}
                      onClick={() => setActiveUrl(url)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border transition-colors flex-shrink-0 ${
                        active ? 'border-orange-300' : 'border-gray-200 hover:border-orange-200'
                      }`}
                      title="切り替え"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="md:w-1/2 p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{submission.title}</h2>
              <StatusBadge status={submission.status} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-full">
              <XCircle size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <h3 className="text-orange-600 text-xs uppercase tracking-widest font-semibold mb-2">DESCRIPTION</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{submission.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <h3 className="text-gray-500 text-xs mb-1">Applicant</h3>
                <p className="text-gray-900 font-medium">{submission.applicant}</p>
              </div>
              <div>
                <h3 className="text-gray-500 text-xs mb-1">Contact</h3>
                <p className="text-gray-900 font-medium text-sm">{submission.email}</p>
              </div>
              <div>
                <h3 className="text-gray-500 text-xs mb-1">Date</h3>
                <p className="text-gray-900 font-medium text-sm">
                  {submission.date || formatDate(submission.created_at_ms)}
                </p>
              </div>
              <div>
                <h3 className="text-gray-500 text-xs mb-1">ID</h3>
                <p className="font-mono text-gray-500 text-xs">{submission.id}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
            <button
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-200/40"
            >
              <CheckCircle size={18} /> 採用 (Approve)
            </button>

            <button
              onClick={onReject}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle size={18} /> 不採用 (Reject)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
