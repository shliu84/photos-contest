import { PawPrint } from 'lucide-react';

interface HeaderProps {
  onNavigateToHome: () => void;
  onNavigateToSubmit: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToHome, onNavigateToSubmit }) => {
  const goHomeAndScroll = (id: string) => {
    onNavigateToHome();
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  // 普通导航按钮统一样式（桌面显示）
  const navButtonClass =
    'px-2 py-1 rounded-md text-sm font-medium transition-all duration-200 ' +
    'hover:bg-black/5 hover:-translate-y-0.5';

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={onNavigateToHome}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">
            <PawPrint size={16} />
          </div>
          <span className="font-bold text-lg">PANDA MEMORIES</span>
        </button>

        {/* Desktop Nav (md 及以上显示) */}
        <div className="hidden md:flex items-center gap-8">
          <button
            className={navButtonClass}
            onClick={() => {
              onNavigateToHome();
              setTimeout(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }, 0);
            }}
          >
            ホーム
          </button>

          <button className={navButtonClass} onClick={() => goHomeAndScroll('about')}>
            企画背景
          </button>

          <button className={navButtonClass} onClick={() => goHomeAndScroll('guidelines')}>
            募集要項
          </button>

          <button
            onClick={onNavigateToSubmit}
            className="
              bg-black text-white px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              hover:bg-white hover:text-black
              hover:ring-1 hover:ring-black
              hover:-translate-y-0.5
            "
          >
            投稿する
          </button>
        </div>

        {/* Mobile CTA (md 以下显示) */}
        <div className="flex md:hidden">
          <button
            onClick={onNavigateToSubmit}
            className="
              bg-black text-white px-3 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              hover:bg-white hover:text-black
              hover:ring-1 hover:ring-black
            "
          >
            投稿する
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
