import { Camera, ChevronRight, Sparkles } from 'lucide-react';

const Hero = () => (
  <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#fffbf5]">
    {/* 背景图层 - 更加柔和的融合 */}
    <div className="absolute inset-0 z-0">
      <img 
        src="https://images.unsplash.com/photo-1527118732049-c88155f2107c?q=80&w=1920&auto=format&fit=crop" 
        alt="Giant Panda" 
        className="w-full h-full object-cover object-top opacity-90 animate-pulse-slow scale-105" 
        style={{ animationDuration: '25s' }}
      />
      {/* 强烈的白色渐变遮罩，让底部完全变白 */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#fffbf5] via-[#fffbf5]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent" />
    </div>

    {/* 内容层 */}
    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20 animate-fade-in-up">
      
      {/* 日期胶囊 - 变得像个可爱的小标签 */}
      <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-orange-100">
        <span className="w-2 h-2 rounded-full bg-[#c0a062] animate-pulse"></span>
        <span className="text-gray-600 text-sm font-bold tracking-widest font-mono">
          2026.03.06 — 04.12
        </span>
      </div>

      {/* 标题 - 增加阴影使其在图片上更清晰 */}
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-gray-800 drop-shadow-sm">
        <span className="block text-2xl md:text-3xl font-medium text-[#c0a062] mb-2 tracking-widest">
          ありがとう、シャンシャン。
        </span>
        「わたしとパンダ」<br />
        <span className="relative inline-block mt-2">
          写真コンテスト
          {/* 装饰性的小圆点 */}
          <span className="absolute -top-4 -right-4 text-[#c0a062] animate-bounce">
            <Sparkles size={32} />
          </span>
        </span>
      </h1>

      <p className="text-lg text-gray-600 font-medium mb-12 tracking-wide">
        あなたのスマホにある、とっておきのパンダを<br className="md:hidden"/>見せてくれませんか？
      </p>

      {/* 按钮区域 - 重点突出投稿按钮 */}
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
        
        {/* 核心按钮：变大、变亮、加投影 */}
        <button className="group relative w-full sm:w-auto bg-gradient-to-r from-[#dcb773] to-[#c0a062] text-white px-12 py-5 rounded-full text-xl font-bold shadow-[0_10px_40px_-10px_rgba(192,160,98,0.6)] hover:shadow-[0_20px_40px_-10px_rgba(192,160,98,0.8)] transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-3 overflow-hidden">
          {/* 按钮内的光泽动画 */}
          <div className="absolute top-0 left-0 w-full h-full bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shine_1s_infinite]" />
          
          <Camera className="w-6 h-6 fill-current" />
          <span>今すぐ投稿する</span>
        </button>

        {/* 次级按钮 - 极简风格 */}
        <button className="w-full sm:w-auto text-gray-500 px-8 py-4 rounded-full font-bold hover:bg-white hover:text-[#c0a062] hover:shadow-md transition-all flex items-center justify-center gap-2">
          詳細を見る <ChevronRight size={18} />
        </button>
      </div>
    </div>
  </header>
);

export default Hero;