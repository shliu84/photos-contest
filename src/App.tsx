import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import HomePage from "./pages/Home"; // 因为你有 pages/Home/index.tsx
import SubmitForm from "./pages/Submit";
import SuccessPage from "./pages/Success";
import AdminDashboard from "./pages/Admin";


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
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>


      <Footer />
    </div>
  );
}

export default App;
