
// 引入修改后的 Header
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import News from './components/sections/News';
import Story from './components/sections/Story';
import Overview from './components/sections/Overview';
import SubmitForm from './components/pages/SubmitForm';

function App() {
  // 页面状态：'home' (首页) | 'submit' (投稿页)
  const [currentPage, setCurrentPage] = useState<'home' | 'submit'>('home');

  // 切换到首页
  const navigateToHome = () => {
    setCurrentPage('home');
    window.scrollTo(0, 0); // 切换时滚到顶部
  };

  // 切换到投稿页
  const navigateToSubmit = () => {
    setCurrentPage('submit');
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#fffbf5] text-gray-900 font-sans selection:bg-[#c0a062] selection:text-white">
      
      {/* 1. 把切换函数传递给 Header */}
      <Header 
        onNavigateToHome={navigateToHome} 
        onNavigateToSubmit={navigateToSubmit} 
      />

      {/* 2. 根据状态显示不同内容 */}
      {currentPage === 'home' ? (
        // === 首页内容 ===
        <>
          <Hero />
          <News />
          <Story />
          <Overview />
          
          {/* 首页底部的悬浮按钮（移动端用）也绑定跳转事件 */}
          <div className="fixed bottom-6 right-6 z-40 md:hidden">
            <button 
              onClick={navigateToSubmit} 
              className="bg-[#c0a062] text-white p-4 rounded-full shadow-lg shadow-orange-200 hover:scale-110 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
        </>
      ) : (
        // === 投稿页内容 ===
        <SubmitForm />
      )}

      <Footer />
    </div>
  );
}

export default App;