import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X, ChevronRight, Check, Info } from 'lucide-react';

const SubmitForm = () => {
  // 模拟文件上传状态
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto">
      
      {/* 标题区域 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">応募フォーム</h1>
        <p className="text-gray-500">
          以下のフォームに必要事項を入力し、作品を投稿してください。<br className="hidden md:block"/>
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

      {/* 表单主体卡片 */}
      <form className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-orange-100/50 border border-gray-100">
        
        {/* ================= SECTION 1: 作品上传 ================= */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
            <ImageIcon className="text-[#c0a062]" size={24} />
            作品アップロード
          </h2>

          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                写真ファイル <BadgeRequired />
              </label>
              
              {!preview ? (
                // 上传空状态
                <div className="relative w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-orange-50 hover:border-[#c0a062] transition-colors flex flex-col items-center justify-center cursor-pointer group">
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="text-[#c0a062]" size={32} />
                  </div>
                  <p className="text-gray-500 font-medium group-hover:text-[#c0a062]">
                    クリックして写真を選択
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    またはファイルをドラッグ＆ドロップ<br/>
                    (JPEG / PNG, 10MB以内)
                  </p>
                </div>
              ) : (
                // 图片预览状态
                <div className="relative w-full h-auto rounded-2xl overflow-hidden border border-gray-200 group">
                  <img src={preview} alt="Preview" className="w-full h-auto max-h-[500px] object-contain bg-gray-900" />
                  <button 
                    type="button"
                    onClick={removeFile}
                    className="absolute top-4 right-4 bg-white/90 text-red-500 p-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white p-3 text-sm truncate">
                    {file?.name}
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
                type="text" 
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
                rows={5}
                placeholder="その時の状況や、パンダへの想いを書いてください..." 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: 拍摄信息 ================= */}
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
                type="date" 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                撮影場所 <span className="text-xs text-gray-400 font-normal ml-2">任意</span>
              </label>
              <select className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none">
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
                  type="text" 
                  placeholder="山田 太郎" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  フリガナ <BadgeRequired />
                </label>
                <input 
                  type="text" 
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
                type="email" 
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
                type="tel" 
                placeholder="090-1234-5678" 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* ================= 底部确认 ================= */}
        <div className="bg-gray-50 p-6 rounded-2xl mb-8">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 w-5 h-5 accent-[#c0a062]" />
            <span className="text-sm text-gray-600 leading-relaxed">
              <a href="#" className="text-[#c0a062] underline hover:text-black">応募規約</a> および <a href="#" className="text-[#c0a062] underline hover:text-black">プライバシーポリシー</a> に同意の上、応募します。
            </span>
          </label>
        </div>

        <div className="text-center">
          <button 
            type="submit"
            className="w-full md:w-2/3 bg-gradient-to-r from-[#dcb773] to-[#c0a062] text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-[#c0a062]/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            確認画面へ進む <ChevronRight size={20} />
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