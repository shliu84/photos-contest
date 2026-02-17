import React, { useState } from 'react';
import { Menu, X, PawPrint } from 'lucide-react';

// 定义 Header 接收的参数类型
interface HeaderProps {
  onNavigateToHome: () => void;   // 跳转回首页的函数
  onNavigateToSubmit: () => void; // 跳转去投稿页的函数
}

const Header: React.FC<HeaderProps> = ({ onNavigateToHome, onNavigateToSubmit }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 辅助函数：点击链接后同时关闭移动端菜单
  const handleMobileNav = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-orange-50/50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo - 点击回首页 */}
        <button 
          onClick={onNavigateToHome} 
          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center transition-transform group-hover:rotate-12">
            <PawPrint size={16} />
          </div>
          <span className="font-bold text-lg tracking-wider text-gray-800 font-sans">
            PANDA MEMORIES
          </span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {/* 首页链接 */}
          <button 
            onClick={onNavigateToHome}
            className="text-sm font-medium text-gray-500 hover:text-[#c0a062] transition-colors"
          >
            TOP
          </button>
          
          {/* 锚点链接 - 只有在首页时才有效，这里简单处理 */}
          <a href="#about" onClick={onNavigateToHome} className="text-sm font-medium text-gray-500 hover:text-[#c0a062] transition-colors">
            企画背景
          </a>
          <a href="#guidelines" onClick={onNavigateToHome} className="text-sm font-medium text-gray-500 hover:text-[#c0a062] transition-colors">
            募集要項
          </a>
          
          {/* 投稿按钮 - 点击去投稿页 */}
          <button 
            onClick={onNavigateToSubmit}
            className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-xs hover:bg-[#c0a062] transition-all transform hover:scale-105 shadow-md"
          >
            投稿する
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-gray-800" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 p-4 absolute w-full shadow-xl rounded-b-2xl h-screen md:h-auto">
          <div className="flex flex-col space-y-2">
            <button 
              onClick={() => handleMobileNav(onNavigateToHome)}
              className="block w-full text-left py-3 px-4 rounded-xl hover:bg-orange-50 text-gray-600 font-medium"
            >
              TOP
            </button>
            <a 
              href="#about" 
              onClick={() => handleMobileNav(onNavigateToHome)}
              className="block w-full text-left py-3 px-4 rounded-xl hover:bg-orange-50 text-gray-600 font-medium"
            >
              企画背景
            </a>
            <a 
              href="#guidelines" 
              onClick={() => handleMobileNav(onNavigateToHome)}
              className="block w-full text-left py-3 px-4 rounded-xl hover:bg-orange-50 text-gray-600 font-medium"
            >
              募集要項
            </a>
            
            <button 
              onClick={() => handleMobileNav(onNavigateToSubmit)}
              className="w-full mt-4 bg-[#c0a062] text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200"
            >
              投稿する
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;