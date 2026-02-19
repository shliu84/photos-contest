import { Image as ImageIcon, Plus, Trash2, Upload, Loader2, X } from "lucide-react";

// 将常量和类型分开引入
import { MAX_PHOTOS } from "../types";
import type { PhotoSlot } from "../types"; // 加上 type 关键字

interface Props {
  photos: PhotoSlot[];
  canAddMore: boolean;
  filledCount: number;
  lastPhotoRef: React.RefObject<HTMLDivElement | null>;
  addPhotoSlot: () => void;
  clearAll: () => void;
  removePhoto: (id: string) => void;
  updatePhotoField: (id: string, field: keyof PhotoSlot, value: string) => void;
  onPickFile: (id: string, file: File | null) => void;
}

export const PhotoSection = ({ photos, canAddMore, filledCount, lastPhotoRef, addPhotoSlot, clearAll, removePhoto, updatePhotoField, onPickFile }: Props) => (
  <section className="mb-12">
    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <ImageIcon className="text-[#c0a062]" size={24} /> 写真（1〜{MAX_PHOTOS}枚）
      </h2>
      <div className="flex items-center gap-3">
        <button type="button" onClick={addPhotoSlot} disabled={!canAddMore} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 hover:border-[#c0a062] disabled:opacity-50 transition-colors">
          <Plus size={16} /> 写真を追加
        </button>
        <button type="button" onClick={clearAll} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 border border-red-100 hover:border-red-200 transition-colors">
          <Trash2 size={16} /> 全て削除
        </button>
      </div>
    </div>
    <p className="text-sm text-gray-500 mb-6">選択済み：<span className="font-bold text-gray-800">{filledCount}</span> / {MAX_PHOTOS}</p>
    
    <div className="space-y-6">
      {photos.map((p, idx) => (
        <div key={p.id} ref={idx === photos.length - 1 ? lastPhotoRef : null} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:border-gray-300 transition-colors">
          {/* 写真のプレビューやアップロード部分 */}
          <div className="p-4 md:p-5 bg-white relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-28 h-20 shrink-0 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center relative">
                  {p.previewUrl ? (
                    <>
                      <img src={p.previewUrl} alt={`photo-${idx + 1}`} className="w-full h-full object-cover" />
                      {p.uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"><Loader2 className="animate-spin" size={20} /></div>}
                    </>
                  ) : <ImageIcon className="text-gray-300" size={28} />}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 mb-2">{idx + 1}枚目</div>
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm ${p.uploading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-gray-200 hover:border-[#c0a062] text-gray-700'}`}>
                    <Upload size={16} /> <span>{p.file ? "写真を変更" : "写真を選択"}</span>
                    <input type="file" accept="image/*" disabled={p.uploading} className="hidden" onChange={(e) => { onPickFile(p.id, e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
                  </label>
                  <div className="text-xs text-gray-400 mt-2">JPEG/PNG, 10MB以内 {p.uploading && <span className="text-[#c0a062] font-medium ml-1">（アップロード中...）</span>}</div>
                </div>
              </div>
              <button type="button" onClick={() => removePhoto(p.id)} className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"><X size={18} /></button>
            </div>
          </div>
          {/* メタデータ入力部分 */}
          {p.file && (
            <div className="p-4 md:p-5 bg-gray-50 border-t border-gray-200 animate-fade-in-up">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">撮影日（任意）</label>
                  <input type="date" value={p.taken_at} onChange={(e) => updatePhotoField(p.id, "taken_at", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">撮影場所（任意）</label>
                  <input type="text" value={p.location} onChange={(e) => updatePhotoField(p.id, "location", e.target.value)} placeholder="例：上野動物園" className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">写真のタイトル（任意）</label>
                  <input type="text" value={p.photo_title} onChange={(e) => updatePhotoField(p.id, "photo_title", e.target.value)} placeholder="例：お昼寝中" className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">写真の説明（任意）</label>
                  <textarea rows={2} value={p.photo_description} onChange={(e) => updatePhotoField(p.id, "photo_description", e.target.value)} placeholder="写真の詳細やエピソードなど…" className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 outline-none resize-none text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
);