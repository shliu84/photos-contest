import React, { useEffect, useMemo, useState } from "react";
import { Upload, Image as ImageIcon, X, ChevronRight, Check, Info } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const SubmitForm = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成预览 & 释放 URL
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const canAddMore = files.length < MAX_PHOTOS;

  const handleFilesAdd = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    setError(null);

    const incomingFiles = Array.from(incoming);

    // 过滤非图片/过大
    const valid = incomingFiles.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_SIZE) return false;
      return true;
    });

    if (valid.length !== incomingFiles.length) {
      setError("画像ファイルのみ / 10MB以内のファイルを選択してください。");
    }

    // 最多 5 张
    const remain = MAX_PHOTOS - files.length;
    const toAdd = valid.slice(0, remain);

    if (toAdd.length < valid.length) {
      setError(`写真は最大${MAX_PHOTOS}枚までです。`);
    }

    setFiles((prev) => [...prev, ...toAdd]);
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("写真ファイルは必須です。");
      return;
    }

    const formEl = e.currentTarget;

    // HTML required 会先拦一部分，但这里再兜底一下
    const agreed = (formEl.elements.namedItem("agreed_terms") as HTMLInputElement | null)?.checked;
    if (!agreed) {
      setError("応募規約・プライバシーポリシーに同意してください。");
      return;
    }

    const fd = new FormData(formEl);

    // 关键：把图片以 photos 追加（后端用 form.getAll("photos")）
    fd.delete("photos"); // 防止某些浏览器自动带上空 FileList
    files.forEach((f) => fd.append("photos", f));

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "送信に失敗しました。");
      }

      // MVP：成功后清空表单，也可以改成跳转确认/完了页
      formEl.reset();
      clearAll();
      alert(`送信完了：${data.submissionId}`);
    } catch (err: any) {
      setError(err?.message || "送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto">
      {/* 标题区域 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">応募フォーム</h1>
        <p className="text-gray-500">
          以下のフォームに必要事項を入力し、作品を投稿してください。<br className="hidden md:block" />
          <span className="text-[#c0a062]">必須</span> は必須項目です。
        </p>
      </div>

      {/* 步骤条 */}
      <div className="flex justify-center items-center gap-4 mb-10 text-sm font-bold">
        <div className="flex flex-col items-center text-[#c0a062]">
          <div className="w-8 h-8 rounded-full bg-[#c0a062] text-white flex items-center justify-center mb-1">
            1
          </div>
          <span>入力</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex flex-col items-center text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">
            2
          </div>
          <span>確認</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex flex-col items-center text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">
            3
          </div>
          <span>完了</span>
        </div>
      </div>

      {/* 表单主体卡片 */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-gray-100">
        {/* 顶部错误提示 */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================= SECTION 1: 作品上传 ================= */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <ImageIcon className="text-[#c0a062]" size={24} />
            作品アップロード
          </h2>

          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                写真ファイル（最大{MAX_PHOTOS}枚） <BadgeRequired />
              </label>

              {/* 上传区 */}
              <div className={`relative w-full h-56 border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center cursor-pointer group
                ${canAddMore ? "border-gray-300 bg-gray-50 hover:bg-orange-50 hover:border-[#c0a062]" : "border-gray-200 bg-gray-100 cursor-not-allowed"}
              `}>
                <input
                  type="file"
                  name="photos"
                  multiple
                  accept="image/*"
                  disabled={!canAddMore || submitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  onChange={(e) => {
                    handleFilesAdd(e.target.files);
                    // 允许再次选择同一文件
                    e.currentTarget.value = "";
                  }}
                />
                <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="text-[#c0a062]" size={32} />
                </div>
                <p className="text-gray-500 font-medium group-hover:text-[#c0a062]">
                  {canAddMore ? "クリックして写真を追加" : `最大${MAX_PHOTOS}枚まで選択済み`}
                </p>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  JPEG / PNG, 10MB以内<br />
                  複数選択OK（最大{MAX_PHOTOS}枚）
                </p>
              </div>

              {/* 预览区（网格缩略图） */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">
                      選択済み：<span className="font-bold text-gray-800">{files.length}</span> / {MAX_PHOTOS}
                    </p>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={submitting}
                      className="text-xs text-gray-500 hover:text-red-500 underline disabled:opacity-50"
                    >
                      すべて削除
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {files.map((f, idx) => (
                      <div key={`${f.name}-${idx}`} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
                        <img src={previews[idx]} alt={f.name} className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          disabled={submitting}
                          className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                          aria-label="remove"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white px-2 py-1 text-[11px] truncate">
                          {idx + 1}. {f.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 作品标题 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                作品タイトル <BadgeRequired />
              </label>
              <input
                name="work_title"
                type="text"
                required
                placeholder="例：桜とシャンシャン"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>

            {/* 作品故事 */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  エピソード・思い出 <BadgeRequired />
                </label>
                <span className="text-xs text-gray-400">100〜150文字程度</span>
              </div>
              <textarea
                name="episode"
                required
                rows={5}
                placeholder="その時の状況や、パンダへの想いを書いてください..."
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: 撮影情報 ================= */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Info className="text-[#c0a062]" size={24} />
            撮影情報
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                撮影日 <span className="text-xs text-gray-400 font-normal ml-2">任意</span>
              </label>
              <input
                name="shoot_date"
                type="date"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                撮影場所 <span className="text-xs text-gray-400 font-normal ml-2">任意</span>
              </label>
              <select
                name="shoot_location"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              >
                <option value="">選択してください</option>
                <option value="ueno">上野動物園</option>
                <option value="wakayama">アドベンチャーワールド</option>
                <option value="kobe">神戸市立王子動物園</option>
                <option value="china">中国（四川など）</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: 応募者情報 ================= */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Check className="text-[#c0a062]" size={24} />
            応募者情報
          </h2>

          <div className="space-y-6">
            {/* 姓名 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  お名前（漢字） <BadgeRequired />
                </label>
                <input
                  name="name_kanji"
                  type="text"
                  required
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  フリガナ <BadgeRequired />
                </label>
                <input
                  name="name_kana"
                  type="text"
                  required
                  placeholder="ヤマダ タロウ"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* 笔名 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ペンネーム <span className="text-xs text-gray-400 font-normal ml-2">※公開時に使用されます</span>
              </label>
              <input
                name="pen_name"
                type="text"
                placeholder="パンダ大好きっ子"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                メールアドレス <BadgeRequired />
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="example@panda.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>

            {/* 电话 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                電話番号 <BadgeRequired />
              </label>
              <input
                name="phone"
                type="tel"
                required
                placeholder="090-1234-5678"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* ================= 底部确认 ================= */}
        <div className="bg-gray-50 p-6 rounded-2xl mb-8">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              name="agreed_terms"
              type="checkbox"
              required
              className="mt-1 w-5 h-5 accent-[#c0a062]"
              disabled={submitting}
            />
            <span className="text-sm text-gray-600 leading-relaxed">
              <a href="#" className="text-[#c0a062] underline hover:text-black">
                応募規約
              </a>{" "}
              および{" "}
              <a href="#" className="text-[#c0a062] underline hover:text-black">
                プライバシーポリシー
              </a>{" "}
              に同意の上、応募します。
            </span>
          </label>
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-2/3 bg-gradient-to-r from-[#dcb773] to-[#c0a062] text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-[#c0a062]/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting ? "送信中..." : "確認画面へ進む"} <ChevronRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

// 辅助组件：必填标签
const BadgeRequired = () => (
  <span className="inline-block bg-red-400 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 align-middle">
    必須
  </span>
);

export default SubmitForm;
