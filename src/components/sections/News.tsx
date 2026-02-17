import React from 'react';
import { ChevronRight } from 'lucide-react';

const newsData = [
  { id: '1', date: '2026.03.06', tag: 'Info', title: '写真コンテスト 応募受付を開始しました！', isNew: true },
  { id: '2', date: '2026.02.28', tag: 'Event', title: '【予告】上野公園にて特別写真展の開催が決定', isNew: false },
  { id: '3', date: '2026.02.15', tag: 'Media', title: '雑誌『和華』春号に特集記事が掲載されました', isNew: false },
];

const News = () => {
  return (
    // 背景改为稍微深一点点的暖白，突出卡片
    <section id="news" className="py-20 bg-[#f8f4eb]">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="w-2 h-8 bg-[#c0a062] rounded-full"></span>
            お知らせ
          </h2>
          <a href="#" className="text-sm font-bold text-[#c0a062] hover:opacity-70 flex items-center gap-1">
            VIEW ALL <ChevronRight size={16} />
          </a>
        </div>

        <div className="space-y-4">
          {newsData.map((item) => (
            <a 
              key={item.id} 
              href="#"
              className="group block bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-0.5 transition-all duration-300 border border-transparent hover:border-orange-100"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                
                {/* 左侧信息 */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-mono text-gray-400 font-medium">
                    {item.date}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    item.tag === 'Info' ? 'bg-blue-50 text-blue-500' :
                    item.tag === 'Event' ? 'bg-green-50 text-green-500' :
                    'bg-orange-50 text-orange-500'
                  }`}>
                    {item.tag}
                  </span>
                </div>

                {/* 标题 */}
                <div className="flex-grow flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-700 group-hover:text-[#c0a062] transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.isNew && (
                    <span className="shrink-0 text-[10px] font-bold text-white bg-red-400 px-2 py-0.5 rounded-full animate-bounce">
                      NEW
                    </span>
                  )}
                </div>
                
                {/* 箭头 */}
                <div className="hidden md:block text-gray-300 group-hover:text-[#c0a062] transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
};

export default News;