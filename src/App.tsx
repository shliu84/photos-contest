import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import News from './components/sections/News';
import Story from './components/sections/Story';
import Overview from './components/sections/Overview';
import SubmitForm from './components/pages/SubmitForm';
import SuccessPage from './components/pages/SuccessPage';

function HomePage({ onNavigateToSubmit }: { onNavigateToSubmit: () => void }) {
  return (
    <>
      <Hero onNavigateToSubmit={onNavigateToSubmit} />
      <News />
      <Story />
      <Overview />

      {/* 首页底部的悬浮按钮（移动端用）也绑定跳转事件 */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={onNavigateToSubmit}
          className="bg-[#c0a062] text-white p-4 rounded-full shadow-lg shadow-orange-200 hover:scale-110 transition-transform"
          aria-label="投稿する"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </div>
    </>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 真页面跳转（URL 变化 + 会进历史记录，后退键可用）
  const navigateToHome = () => navigate("/");
  const navigateToSubmit = () => navigate("/submit");

  // ✅ 路由变化时滚到顶部（替代你之前写在函数里的 scrollTo）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#fffbf5] text-gray-900 font-sans selection:bg-[#c0a062] selection:text-white">
      {/* ✅ 你这句可以继续保留 */}
      <Header
        onNavigateToHome={navigateToHome}
        onNavigateToSubmit={navigateToSubmit}
      />

      <Routes>
        <Route path="/" element={<HomePage onNavigateToSubmit={navigateToSubmit} />} />
        <Route path="/submit" element={<SubmitForm />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
