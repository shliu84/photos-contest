import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Check, ArrowLeft, Twitter, Instagram, Share2, Sparkles } from 'lucide-react';

const SuccessPage = () => {
  // 1. 获取从上一页 (SubmitPage) 传过来的 submissionId
  const location = useLocation();
  const state = location.state as { submissionId?: string } | null;
  const submissionId = state?.submissionId;

  // 页面加载时自动滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- 分享逻辑 ---
  
  // 分享到 X (Twitter)
  const shareToX = () => {
    const text = encodeURIComponent("「わたしとパンダ」写真コンテストに応募しました！🐼✨\nあなたもとっておきのパンダ写真を投稿しませんか？\n\n#わたしとパンダ #和華 #PandaMemories");
    const url = encodeURIComponent(window.location.origin); // 自动获取当前网站域名
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  // 分享到 Instagram (由于 API 限制，引导用户去 App)
  const shareToIns = () => {
    alert("Instagramアプリを開いて、ハッシュタグ #わたしとパンダ をつけて写真を投稿してください！\n(クリップボードにハッシュタグをコピーしました ※模擬)");
    // 实际项目中这里可以做一个复制文本到剪贴板的功能
  };

  return (
    <div className="pt-32 pb-20 px-4 max-w-2xl mx-auto min-h-[80vh] flex items-center justify-center">
      
      {/* 成功主体卡片 - 这里的 animate-fade-in-up 需要在 CSS 中定义，或者使用 Tailwind 配置 */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-orange-100/50 border border-gray-100 text-center relative overflow-hidden w-full animate-fade-in-up">
        
        {/* 背景装饰：淡淡的圆圈 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        {/* 成功图标 (带呼吸动画) */}
        <div className="relative w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
          <Check size={48} strokeWidth={3} />
          {/* 小装饰星星 */}
          <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-bounce" size={24} />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          応募を受け付けました
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          大切な思い出をシェアしていただき、<br className="hidden md:block"/>
          誠にありがとうございました。<br/>
          審査結果の発表を楽しみにお待ちください。
        </p>

        {/* 受付番号展示区 */}
        {submissionId && (
          <div className="inline-block bg-gray-50 border border-dashed border-gray-300 rounded-xl px-6 py-3 mb-10">
            <span className="block text-xs text-gray-400 mb-1">受付番号 (Submission ID)</span>
            <span className="font-mono text-lg font-bold text-gray-700 tracking-wider">
              {submissionId}
            </span>
          </div>
        )}

        {/* 分享区块 */}
        <div className="bg-[#fffbf5] rounded-[2rem] p-6 mb-10 border border-orange-100 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[#c0a062] text-xs font-bold uppercase tracking-widest flex items-center gap-1 border border-orange-100 rounded-full">
            <Share2 size={12} /> Share Memory
          </div>
          
          <p className="text-sm text-gray-500 mb-4 mt-2">
            コンテストに参加したことをシェアしませんか？
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* X (Twitter) 按钮 */}
            <button 
              onClick={shareToX}
              className="group flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 rounded-full font-bold hover:bg-gray-800 transition-all hover:-translate-y-1 shadow-lg shadow-gray-200"
            >
              <Twitter size={18} fill="currentColor" />
              <span>Xでポスト</span>
            </button>
            
            {/* Instagram 按钮 */}
            <button 
              onClick={shareToIns}
              className="group flex items-center justify-center gap-2 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white px-6 py-3.5 rounded-full font-bold transition-all hover:-translate-y-1 shadow-lg shadow-pink-200"
            >
              <Instagram size={18} />
              <span>Instagram</span>
            </button>
          </div>
        </div>

        {/* 返回首页链接 */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#c0a062] font-bold transition-colors group px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          トップページへ戻る
        </Link>

      </div>

      {/* 底部小字 */}
      <div className="fixed bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-gray-400 opacity-50">
           © 2026 PANDA MEMORIES
        </p>
      </div>
    </div>
  );
};

export default SuccessPage;