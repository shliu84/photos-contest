import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react"; // 加上 type 关键字

// 将常量和类型分开引入
import { MAX_PHOTOS, MAX_SIZE } from "../types";
import type { PhotoSlot, PhotoMeta } from "../types"; // 加上 type 关键字

export const useSubmitForm = () => {
  const lastPhotoRef = useRef<HTMLDivElement | null>(null);

  const [photos, setPhotos] = useState<PhotoSlot[]>([{
    id: crypto.randomUUID(),
    file: null,
    previewUrl: null,
    uploading: false,
    meta: null,
    taken_at: "",
    location: "",
    photo_title: "",
    photo_description: "",
  }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const canAddMore = photos.length < MAX_PHOTOS;
  const filledCount = photos.filter((p) => p.file !== null).length;

  useEffect(() => {
    if (photos.length > 1) {
      lastPhotoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [photos.length]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [photos]);

  const addPhotoSlot = () => {
    if (!canAddMore) return;
    setPhotos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file: null, previewUrl: null, uploading: false, meta: null,
        taken_at: "", location: "", photo_title: "", photo_description: "",
      },
    ]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    photos.forEach((p) => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    setPhotos([{
      id: crypto.randomUUID(), file: null, previewUrl: null, uploading: false, meta: null,
      taken_at: "", location: "", photo_title: "", photo_description: "",
    }]);
    setError(null);
  };

  const updatePhotoField = (id: string, field: keyof PhotoSlot, value: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const onPickFile = async (id: string, file: File | null) => {
    if (!file) return;
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

    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return { ...p, file, previewUrl, uploading: true, meta: null };
        }
        return p;
      })
    );

    // モックアップロード処理
    setTimeout(() => {
      const mockMeta: PhotoMeta = {
        r2_key: `mock-folder/${Date.now()}-${file.name}`,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      };
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, uploading: false, meta: mockMeta } : p)));
    }, 1500);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validPhotos = photos.filter((p) => p.file !== null);
    if (validPhotos.length === 0) {
      setError("少なくとも1枚の写真を選択してください。"); return;
    }
    if (validPhotos.some((p) => p.uploading || !p.meta)) {
      setError("画像のアップロード中です。完了まで少々お待ちください。"); return;
    }
    if (!agreed) {
      setError("応募規約に同意してください。"); return;
    }

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
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

    setTimeout(() => {
      console.log("=== 準備送信データ ===", JSON.stringify(payload, null, 2));
      setSubmitting(false);
      alert("フロントエンドUIテスト：バリデーション通過！");
    }, 2000);
  };

  return {
    photos, submitting, error, agreed, setAgreed,
    canAddMore, filledCount, lastPhotoRef,
    addPhotoSlot, removePhoto, clearAll, updatePhotoField, onPickFile, handleSubmit
  };
};