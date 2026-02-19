import { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, X, ChevronRight, Check, Info, Loader2, Plus, Trash2 } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface PhotoMeta {
  r2_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
}

// 统一的单张照片数据结构
interface PhotoSlot {
  id: string;
  file: File | null;
  previewUrl: string | null;
  uploading: boolean;
  meta: PhotoMeta | null;
  taken_at: string;
  location: string;
  photo_title: string;
  photo_description: string;
}

const SubmitPage = () => {
  // const navigate = useNavigate();
  // 1. 创建一个 Ref 用来追踪最后一个槽位
const lastPhotoRef = useRef<HTMLDivElement | null>(null);


  // --- 状态管理 ---
  // 默认初始提供一个空的上传槽位
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    {
      id: crypto.randomUUID(),
      file: null,
      previewUrl: null,
      uploading: false,
      meta: null,
      taken_at: "",
      location: "",
      photo_title: "",
      photo_description: "",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // --- 派生状态 ---
  const canAddMore = photos.length < MAX_PHOTOS;
  const filledCount = photos.filter((p) => p.file !== null).length;
  // 2. 监听 photos 长度的变化
useEffect(() => {
  // 当照片数量增加（且不是初始化）时，平滑滚动到新元素
  if (photos.length > 1) {
    lastPhotoRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "center" 
    });
  }
}, [photos.length]); // 仅在长度改变时触发

  // 组件卸载时清理预览 URL，防止内存泄漏
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []); // 仅卸载时执行清理

  // --- 照片控件操作逻辑 ---

  // 1. 添加一个空的照片槽位
  const addPhotoSlot = () => {
    if (!canAddMore) return;
    setPhotos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file: null,
        previewUrl: null,
        uploading: false,
        meta: null,
        taken_at: "",
        location: "",
        photo_title: "",
        photo_description: "",
      },
    ]);
  };

  // 2. 移除指定槽位
  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // 3. 清空所有，重置为一个空槽位
  const clearAll = () => {
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPhotos([
      {
        id: crypto.randomUUID(),
        file: null,
        previewUrl: null,
        uploading: false,
        meta: null,
        taken_at: "",
        location: "",
        photo_title: "",
        photo_description: "",
      },
    ]);
    setError(null);
  };

  // 4. 更新槽位中的文本/日期字段
  const updatePhotoField = (id: string, field: keyof PhotoSlot, value: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // 5. 选中图片并直传 R2
  // const onPickFile = async (id: string, file: File | null) => {
  //   if (!file) return;

  //   // 前端校验
  //   if (!file.type.startsWith("image/")) {
  //     setError("画像ファイルのみ選択可能です。");
  //     return;
  //   }
  //   if (file.size > MAX_SIZE) {
  //     setError("10MB以内のファイルを選択してください。");
  //     return;
  //   }

  //   setError(null);
  //   const previewUrl = URL.createObjectURL(file);

  //   // 更新槽位状态为：已选文件、正在上传
  //   setPhotos((prev) =>
  //     prev.map((p) => {
  //       if (p.id === id) {
  //         if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); // 清理旧预览
  //         return { ...p, file, previewUrl, uploading: true, meta: null };
  //       }
  //       return p;
  //     })
  //   );

  //   try {
  //     // 获取上传签名
  //     const res = await fetch(`/api/upload-url?filename=${encodeURIComponent(file.name)}`);
  //     if (!res.ok) throw new Error("アップロード情報の取得に失敗しました");
      
  //     const { url, key, headers } = await res.json();

  //     // 直传 R2
  //     const uploadRes = await fetch(url, {
  //       method: "PUT",
  //       headers: {
  //         ...headers,
  //         "Content-Type": file.type,
  //       },
  //       body: file,
  //     });

  //     if (!uploadRes.ok) {
  //       const errText = await uploadRes.text();
  //       throw new Error(`R2 Upload Failed: ${uploadRes.status} ${errText}`);
  //     }

  //     // 上传成功，写入元数据并取消 uploading 状态
  //     const meta: PhotoMeta = {
  //       r2_key: key,
  //       original_filename: file.name,
  //       content_type: file.type,
  //       size_bytes: file.size,
  //     };

  //     setPhotos((prev) =>
  //       prev.map((p) => (p.id === id ? { ...p, uploading: false, meta } : p))
  //     );

  //   } catch (err: any) {
  //     console.error("Upload Error:", err);
  //     setError(`${file.name} のアップロードに失敗しました: ${err.message}`);
  //     // 上传失败时，重置该槽位的文件状态，保留其它文本信息
  //     setPhotos((prev) =>
  //       prev.map((p) =>
  //         p.id === id ? { ...p, file: null, previewUrl: null, uploading: false } : p
  //       )
  //     );
  //   }
  // };

  // 5. 选中图片并模拟直传 R2 (纯前端测试版)
  const onPickFile = async (id: string, file: File | null) => {
    if (!file) return;

    // 前端校验
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルのみ選択可能です。");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("10MB以内のファイルを選択してください。");
      return;
    }

    setError(null);
    const previewUrl = URL.createObjectURL(file);

    // 更新槽位状态为：已选文件、正在上传
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); // 清理旧预览
          return { ...p, file, previewUrl, uploading: true, meta: null };
        }
        return p;
      })
    );

    // 【修改点】：使用 setTimeout 模拟 1.5 秒的网络延迟，然后伪造一个上传成功的返回数据
    setTimeout(() => {
      const mockMeta: PhotoMeta = {
        r2_key: `mock-folder/${Date.now()}-${file.name}`,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      };

      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, uploading: false, meta: mockMeta } : p))
      );
    }, 1500);
  };

  // --- 提交表单逻辑 ---
  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   setError(null);

  //   // 过滤出真正包含图片的槽位
  //   const validPhotos = photos.filter((p) => p.file !== null);

  //   if (validPhotos.length === 0) {
  //     setError("少なくとも1枚の写真を選択してください。");
  //     return;
  //   }

  //   if (validPhotos.some((p) => p.uploading || !p.meta)) {
  //     setError("画像のアップロード中です。完了まで少々お待ちください。");
  //     return;
  //   }

  //   if (!agreed) {
  //     setError("応募規約に同意してください。");
  //     return;
  //   }

  //   setSubmitting(true);
  //   const formData = new FormData(e.currentTarget);

  //   // 组装最终照片数组
  //   const finalPhotos = validPhotos.map((p) => ({
  //     ...p.meta,
  //     photo_title: p.photo_title || undefined,
  //     photo_description: p.photo_description || undefined,
  //     shoot_date: p.taken_at || undefined,
  //     shoot_location: p.location || undefined,
  //   }));

  //   const payload = {
  //     work_title: formData.get("work_title"),
  //     episode: formData.get("episode"),
  //     name_kanji: formData.get("name_kanji"),
  //     name_kana: formData.get("name_kana"),
  //     email: formData.get("email"),
  //     phone: formData.get("phone"),
  //     agreed_terms: 1,
  //     pen_name: formData.get("pen_name") || undefined,
  //     photos: finalPhotos,
  //   };

  //   try {
  //     const response = await fetch("/api/submissions", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     const result = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result.error || "送信に失敗しました");
  //     }

  //     navigate("/success", { state: { submissionId: result.submissionId } });
  //   } catch (err: any) {
  //     setError(err.message || "エラーが発生しました。");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  // --- 提交表单逻辑 (纯前端测试版) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 过滤出真正包含图片的槽位
    const validPhotos = photos.filter((p) => p.file !== null);

    if (validPhotos.length === 0) {
      setError("少なくとも1枚の写真を選択してください。");
      return;
    }

    if (validPhotos.some((p) => p.uploading || !p.meta)) {
      setError("画像のアップロード中です。完了まで少々お待ちください。");
      return;
    }

    if (!agreed) {
      setError("応募規約に同意してください。");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    // 组装最终照片数组
    const finalPhotos = validPhotos.map((p) => ({
      ...p.meta,
      photo_title: p.photo_title || undefined,
      photo_description: p.photo_description || undefined,
      shoot_date: p.taken_at || undefined,
      shoot_location: p.location || undefined,
    }));

    const payload = {
      work_title: formData.get("work_title"),
      episode: formData.get("episode"),
      name_kanji: formData.get("name_kanji"),
      name_kana: formData.get("name_kana"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      agreed_terms: 1,
      pen_name: formData.get("pen_name") || undefined,
      photos: finalPhotos,
    };

    // 【修改点】：不发真实 fetch 请求，模拟 2 秒延迟后打印组装好的数据
    setTimeout(() => {
      console.log("=== 准备发送给后端的 JSON 数据 ===", JSON.stringify(payload, null, 2));
      setSubmitting(false);
      alert("前端 UI 测试：表单校验通过！\n请按 F12 打开浏览器控制台查看最终生成的 JSON 数据。");
      
      // 测试阶段先注释掉跳转，方便留在当前页面查看状态
      // navigate("/success", { state: { submissionId: "mock-12345" } });
    }, 2000);
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
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2 animate-pulse">
             <Info size={16} /> {error}
          </div>
        )}

        {/* 1. 作品全体情報 */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <ImageIcon className="text-[#c0a062]" size={24} />
            作品グループ情報
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                作品全体のタイトル（大見出し） <BadgeRequired />
              </label>
              <input
                name="work_title"
                type="text"
                required
                placeholder="例：パンダの四季"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold text-gray-700">
                  全体のエピソード・総評 <BadgeRequired />
                </label>
                <span className="text-xs text-gray-400">100〜150文字程度</span>
              </div>
              <textarea
                name="episode"
                required
                rows={4}
                placeholder="この作品群を通して伝えたい思いや、背景を書いてください..."
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* 2. 写真エリア (用户提供的 UI 还原) */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon className="text-[#c0a062]" size={24} />
              写真（1〜{MAX_PHOTOS}枚）
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addPhotoSlot}
                disabled={!canAddMore}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 hover:border-[#c0a062] disabled:opacity-50 transition-colors"
              >
                <Plus size={16} /> 写真を追加
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 border border-red-100 hover:border-red-200 transition-colors"
              >
                <Trash2 size={16} /> 全て削除
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            選択済み：<span className="font-bold text-gray-800">{filledCount}</span> / {MAX_PHOTOS}
          </p>

          <div className="space-y-6">
            {photos.map((p, idx) => (
              <div 
      key={p.id} 
      // 【关键点】：如果是最后一项，绑定 ref
      ref={idx === photos.length - 1 ? lastPhotoRef : null}
      className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:border-gray-300 transition-colors"
    >
                {/* 上部：プレビュー/選択 */}
                <div className="p-4 md:p-5 bg-white relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* 缩略图区域 */}
                      <div className="w-28 h-20 shrink-0 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center relative">
                        {p.previewUrl ? (
                          <>
                            <img src={p.previewUrl} alt={`photo-${idx + 1}`} className="w-full h-full object-cover" />
                            {p.uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                <Loader2 className="animate-spin" size={20} />
                              </div>
                            )}
                          </>
                        ) : (
                          <ImageIcon className="text-gray-300" size={28} />
                        )}
                      </div>

                      {/* 上传按钮区域 */}
                      <div>
                        <div className="text-sm font-bold text-gray-800 mb-2">
                          {idx + 1}枚目
                        </div>
                        <label className={`
                          inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm
                          ${p.uploading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-gray-200 hover:border-[#c0a062] text-gray-700'}
                        `}>
                          <Upload size={16} />
                          <span>{p.file ? "写真を変更" : "写真を選択"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={p.uploading}
                            className="hidden"
                            onChange={(e) => {
                              onPickFile(p.id, e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <div className="text-xs text-gray-400 mt-2">
                          JPEG/PNG, 10MB以内
                          {p.uploading && <span className="text-[#c0a062] font-medium ml-1">（アップロード中...）</span>}
                        </div>
                      </div>
                    </div>

                    {/* 删除该槽位按钮 */}
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="この写真を削除"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* 下部：詳細情報（写真選択時のみ表示） */}
                {p.file && (
                  <div className="p-4 md:p-5 bg-gray-50 border-t border-gray-200 animate-fade-in-up">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">撮影日（任意）</label>
                        <input
                          type="date"
                          value={p.taken_at}
                          onChange={(e) => updatePhotoField(p.id, "taken_at", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">撮影場所（任意）</label>
                        <input
                          type="text"
                          value={p.location}
                          onChange={(e) => updatePhotoField(p.id, "location", e.target.value)}
                          placeholder="例：上野動物園"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">写真のタイトル（任意）</label>
                        <input
                          type="text"
                          value={p.photo_title}
                          onChange={(e) => updatePhotoField(p.id, "photo_title", e.target.value)}
                          placeholder="例：お昼寝中"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">写真の説明（任意）</label>
                        <textarea
                          rows={2}
                          value={p.photo_description}
                          onChange={(e) => updatePhotoField(p.id, "photo_description", e.target.value)}
                          placeholder="写真の詳細やエピソードなど…"
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. 応募者情報 */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Check className="text-[#c0a062]" size={24} />
            応募者情報
          </h2>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">お名前（漢字） <BadgeRequired /></label>
                <input name="name_kanji" type="text" required placeholder="山田 太郎" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">フリガナ <BadgeRequired /></label>
                <input name="name_kana" type="text" required placeholder="ヤマダ タロウ" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ペンネーム <span className="text-xs text-gray-400 font-normal ml-2">※公開時に使用されます</span></label>
              <input name="pen_name" type="text" placeholder="パンダ大好きっ子" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">メールアドレス <BadgeRequired /></label>
              <input name="email" type="email" required placeholder="example@panda.com" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">電話番号 <BadgeRequired /></label>
              <input name="phone" type="tel" required placeholder="090-1234-5678" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
            </div>
          </div>
        </div>
        
        {/* 規約と送信 */}
        <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center pt-1">
              <input type="checkbox" className="peer sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={submitting} />
              <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#c0a062] peer-checked:border-[#c0a062] transition-colors flex items-center justify-center">
                <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
              </div>
            </div>
            <span className="text-sm text-gray-600 leading-relaxed">
              <a href="#" className="text-[#c0a062] font-bold hover:text-black">応募規約</a> および <a href="#" className="text-[#c0a062] font-bold hover:text-black">プライバシーポリシー</a> に同意の上、応募します。
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
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#dcb773] to-[#c0a062] shadow-[0_10px_30px_-10px_rgba(192,160,98,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(192,160,98,0.7)] hover:-translate-y-1 hover:scale-[1.02]'
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