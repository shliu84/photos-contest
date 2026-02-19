import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, X, ChevronRight, Check, Info, Loader2 } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// 定义每一张照片上传成功后的元数据结构
interface PhotoMeta {
  r2_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
}

const SubmitPage = () => {
  const navigate = useNavigate();
  
  // --- 状态管理 ---
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photoMetas, setPhotoMetas] = useState<(PhotoMeta | null)[]>([]); 
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // 生成预览 & 释放 URL
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const canAddMore = files.length < MAX_PHOTOS;

  // --- 核心逻辑：单张图片上传到 R2 (Updated) ---
  const uploadToR2 = async (file: File, index: number) => {
    try {
      // 1. 获取签名信息 (URL + Headers)
      const res = await fetch(`/api/upload-url?filename=${encodeURIComponent(file.name)}`);
      if (!res.ok) throw new Error("アップロード情報の取得に失敗しました");
      
      // ✅ 变更点：这里解构出 headers
      const { url, key, headers } = await res.json();

      // 2. 直传 R2 (PUT)
      // ✅ 变更点：将接口返回的 headers 放入请求头
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          ...headers, // 必须包含 Authorization, x-amz-date 等
          "Content-Type": file.type, // 建议带上，确保 R2 知道这是图片
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`R2 Upload Failed: ${uploadRes.status} ${errText}`);
      }

      // 3. 更新元数据 (表示上传完成)
      const meta: PhotoMeta = {
        r2_key: key,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      };

      setPhotoMetas((prev) => {
        const next = [...prev];
        next[index] = meta;
        return next;
      });

    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(`${file.name} のアップロードに失敗しました: ${err.message}`);
      removeAt(index);
    }
  };

  // --- 文件选择处理逻辑 ---
  const handleFilesAdd = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setError(null);

    const incomingFiles = Array.from(incoming);

    const valid = incomingFiles.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_SIZE) return false;
      return true;
    });

    if (valid.length !== incomingFiles.length) {
      setError("画像ファイルのみ / 10MB以内のファイルを選択してください。");
    }

    const remain = MAX_PHOTOS - files.length;
    const toAdd = valid.slice(0, remain);

    if (toAdd.length < valid.length) {
      setError(`写真は最大${MAX_PHOTOS}枚までです。`);
    }

    if (toAdd.length === 0) return;

    const startIndex = files.length;
    setFiles((prev) => [...prev, ...toAdd]);
    setPhotoMetas((prev) => [...prev, ...new Array(toAdd.length).fill(null)]);

    toAdd.forEach((file, i) => {
      uploadToR2(file, startIndex + i);
    });
  };

  const removeAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoMetas((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setPhotoMetas([]);
    setError(null);
  };

  // --- 提交表单逻辑 ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("写真ファイルは必須です。");
      return;
    }
    
    if (photoMetas.some((meta) => meta === null)) {
      setError("画像のアップロード中です。完了まで少々お待ちください。");
      return;
    }

    if (!agreed) {
      setError("応募規約に同意してください。");
      return;
    }

    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    const payload = {
      work_title: formData.get("work_title"),
      episode: formData.get("episode"),
      name_kanji: formData.get("name_kanji"),
      name_kana: formData.get("name_kana"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      agreed_terms: 1,
      shoot_date: formData.get("shoot_date") || undefined,
      shoot_location: formData.get("shoot_location") || undefined,
      pen_name: formData.get("pen_name") || undefined,
      photos: photoMetas as PhotoMeta[], 
    };

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "送信に失敗しました");
      }

      console.log("Submit Success:", result);
      navigate("/success", { state: { submissionId: result.submissionId } });

    } catch (err: any) {
      setError(err.message || "エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto animate-fade-in-up">
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
          <div className="w-8 h-8 rounded-full bg-[#c0a062] text-white flex items-center justify-center mb-1">1</div>
          <span>入力</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex flex-col items-center text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">2</div>
          <span>確認</span>
        </div>
        <div className="w-12 h-0.5 bg-gray-200"></div>
        <div className="flex flex-col items-center text-gray-400">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">3</div>
          <span>完了</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-gray-100">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 animate-pulse">
             <Info size={16} /> {error}
          </div>
        )}

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

              <div className={`relative w-full h-56 border-2 border-dashed rounded-2xl transition-colors flex flex-col items-center justify-center cursor-pointer group
                ${canAddMore ? "border-gray-300 bg-gray-50 hover:bg-orange-50 hover:border-[#c0a062]" : "border-gray-200 bg-gray-100 cursor-not-allowed"}
              `}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={!canAddMore || submitting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  onChange={(e) => {
                    handleFilesAdd(e.target.files);
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

              {files.length > 0 && (
                <div className="mt-4 animate-fade-in-up">
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
                      <div key={`${f.name}-${idx}`} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group h-32">
                        <img 
                          src={previews[idx]} 
                          alt={f.name} 
                          className={`w-full h-full object-cover transition-opacity duration-300 ${!photoMetas[idx] ? 'opacity-50' : 'opacity-100'}`} 
                        />
                        {!photoMetas[idx] && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/30 z-10">
                            <Loader2 className="animate-spin mb-1" size={24} />
                            <span className="text-[10px] font-bold">UP...</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          disabled={submitting}
                          className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 z-20"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white px-2 py-1 text-[11px] truncate z-20">
                          {idx + 1}. {f.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Check className="text-[#c0a062]" size={24} />
            応募者情報
          </h2>

          <div className="space-y-6">
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
        
        <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={submitting}
              />
              <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#c0a062] peer-checked:border-[#c0a062] transition-colors flex items-center justify-center">
                <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
              </div>
            </div>
            <span className="text-sm text-gray-600 leading-relaxed">
              <a href="#" className="text-[#c0a062] font-bold hover:text-black">応募規約</a>
              {" "}および{" "}
              <a href="#" className="text-[#c0a062] font-bold hover:text-black">プライバシーポリシー</a>
              {" "}に同意の上、応募します。
            </span>
          </label>
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={submitting || !agreed}
            className={`
              group relative w-full md:w-2/3 px-8 py-4 rounded-full text-lg font-bold text-white
              flex items-center justify-center gap-3 transition-all duration-300
              ${!agreed || submitting
                ? 'bg-gray-300 cursor-not-allowed shadow-none' // 禁用状态
                : 'bg-gradient-to-r from-[#dcb773] to-[#c0a062] shadow-[0_10px_30px_-10px_rgba(192,160,98,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(192,160,98,0.7)] hover:-translate-y-1 hover:scale-[1.02]' // 激活状态
              }
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>送信中...</span>
              </>
            ) : (
              <>
                <span>投稿する</span>
                <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform">
                  <ChevronRight size={20} />
                </div>
              </>
            )}
          </button>
          
          {!agreed && !submitting && (
            <p className="text-xs text-red-400 mt-3 animate-pulse">
              ※ 上記の規約に同意チェックを入れてください
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

const BadgeRequired = () => (
  <span className="inline-block bg-red-400 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 align-middle">
    必須
  </span>
);

export default SubmitPage;