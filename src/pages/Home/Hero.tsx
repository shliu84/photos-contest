import { Camera, ChevronRight, Sparkles } from 'lucide-react';
import pandaHero from "../../assets/imgs/panda-hero.png";

interface HeroProps {
  onNavigateToSubmit: () => void;
}
const Hero: React.FC<HeroProps> = ({ onNavigateToSubmit }) =>
  <header className="relative min-h-[90vh] flex items-center justify-center overflow-visible bg-[#fffbf5] pt-40">
    {/* 背景图层 - 更加柔和的融合 */}
    <div className="absolute inset-0 z-0 pointer-events-none">

      <img
        src={pandaHero}
        alt="Hero Background"
        // className="w-full h-[120%] object-cover object-top"
        className="
    w-full h-[120%] object-cover object-top
  "
      />
    </div>
    {/* 强烈的白色渐变遮罩，让底部完全变白 */}
    {/* 白色渐变蒙版 */}
    <div
      className="
    absolute left-0 top-0
    w-full h-[120%]
    pointer-events-none
    bg-[radial-gradient(ellipse_90%_90%_at_50%_40%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.5)_55%,rgba(255,255,255,0)_70%)]
  "
    />
    {/* <div
  className={`
    absolute left-0 top-0 w-full h-[120%] pointer-events-none
    bg-[radial-gradient(ellipse_90%_90%_at_50%_40%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.5)_55%,rgba(255,255,255,0)_70%)]
    md:bg-[radial-gradient(ellipse_90%_90%_at_50%_40%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.5)_55%,rgba(255,255,255,0)_70%)]
  `}
/> */}

    {/* <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.6)_30%,rgba(255,255,255,0.2)_55%,rgba(255,255,255,0)_75%)]" /> */}
    {/* <div className="absolute inset-0 bg-gradient-to-t from-[#fffbf5] via-[#fffbf5]/60 to-transparent" /> */}
    {/* <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent" /> */}


    {/* 内容层 */}
    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20 animate-fade-in-up">
      {/* <div className="relative z-10 flex justify-center px-4  animate-fade-in-up"> */}
      {/* <div className="
      text-center max-w-4xl
      px-20 py-12
      bg-white/60 backdrop-blur-xl
      rounded-[2.5rem]
      shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)]
      border border-white/40
    "
      > */}
      {/* 日期胶囊 - 变得像个可爱的小标签 */}
      <div className="
  inline-flex items-center gap-2 mb-8
  px-5 py-2
  md:px-7 md:py-3
  bg-white/80 backdrop-blur-md
  rounded-full shadow-sm border border-orange-100
">
        <span className="
    w-2 h-2
    md:w-2.5 md:h-2.5
    rounded-full bg-[#c0a062] animate-pulse
  "></span>

        <span className="
    text-gray-600 font-bold tracking-widest font-mono
    text-sm md:text-base lg:text-lg
  ">
          2026.03.06 — 04.12
        </span>
      </div>


      {/* 标题 - 增加阴影使其在图片上更清晰 */}
      {/* <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-gray-800 drop-shadow-sm"> */}
      <h1 className="text-4xl md:text-7xl lg:text-8xl font-extrabold font-rounded mb-6 leading-tight text-gray-800 drop-shadow-sm">
        {/* <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-cute mb-6 leading-tight text-gray-800 drop-shadow-sm"> */}
        {/* <h1 className="font-cute text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight text-gray-800 drop-shadow-sm"> */}

        <span className="block text-2xl md:text-3xl font-medium text-[#c0a062] mb-2 tracking-widest">
          ありがとう、シャンシャン。
        </span>
        「わたしとパンダ」
        <br />
        <span className="relative inline-block mt-2">
          写真コンテスト
          {/* 装饰性的小圆点 */}
          <span className="absolute -top-4 -right-4 text-[#c0a062] animate-bounce">
            <Sparkles size={32} />
          </span>
        </span>
      </h1>


      <p className="text-lg text-gray-600 font-medium mb-12 tracking-wide">
        あなたのスマホにある、とっておきのパンダを<br className="md:hidden" />見せてくれませんか？
      </p>

      {/* 按钮区域 - 重点突出投稿按钮 */}
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">

        {/* 核心按钮：变大、变亮、加投影 */}
        <button onClick={onNavigateToSubmit} className="group relative w-full sm:w-auto bg-gradient-to-r from-[#dcb773] to-[#c0a062] text-white px-12 py-5 rounded-full text-xl font-bold shadow-[0_10px_40px_-10px_rgba(192,160,98,0.6)] hover:shadow-[0_20px_40px_-10px_rgba(192,160,98,0.8)] transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-3 overflow-hidden">
          {/* 按钮内的光泽动画 */}
          <div className="absolute top-0 left-0 w-full h-full bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shine_1s_infinite]" />

          <Camera className="w-6 h-6 fill-current" />
          <span>今すぐ投稿する</span>
        </button>

        {/* 次级按钮 - 极简风格 */}
        <button className="w-full sm:w-auto bg-white/70 text-gray-600 px-8 py-4 rounded-full font-bold backdrop-blur-sm border border-orange-100 hover:bg-white hover:text-[#c0a062] hover:shadow-md transition-all flex items-center justify-center gap-2">
          詳細を見る <ChevronRight size={18} />
        </button>

      </div>
    </div>
    {/* </div> */}
  </header>
  ;

export default Hero;