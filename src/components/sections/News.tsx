const newsData = [
  {
    id: '1',
    date: '2026.03.06',
    tag: 'Info',
    title: '写真コンテスト 応募受付を開始しました！',
    isNew: true,
  },
  {
    id: '2',
    date: '2026.02.28',
    tag: 'Event',
    title: '【予告】上野公園にて特別写真展の開催が決定',
    isNew: false,
  },
  {
    id: '3',
    date: '2026.02.15',
    tag: 'Media',
    title: '雑誌『和華』春号に特集記事が掲載されました',
    isNew: false,
  },
];

const tagClass = (tag: string) =>
  tag === 'Info'
    ? 'bg-blue-50 text-blue-600'
    : tag === 'Event'
    ? 'bg-green-50 text-green-600'
    : 'bg-orange-50 text-orange-600';

const News = () => {
  return (
    <section id="news" className="py-14 md:py-20 bg-[#f8f4eb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* 标题 */}
        <div className="mb-6 md:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="w-2 h-7 sm:h-8 bg-[#c0a062] rounded-full" />
            お知らせ
          </h2>
        </div>

        {/* 新闻列表 */}
        <div className="space-y-3 sm:space-y-4">
          {newsData.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-orange-50 shadow-sm"
            >
              <div className="p-4 sm:p-5 select-text">
                {/* 同一行容器：日期 + Tag + 标题 + NEW */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {/* 日期 */}
                  <span className="text-xs sm:text-sm font-mono text-gray-400 font-medium shrink-0">
                    {item.date}
                  </span>

                  {/* Tag */}
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${tagClass(
                      item.tag
                    )}`}
                  >
                    {item.tag}
                  </span>

                  {/* 标题（可换行的关键） */}
                  <h3 className="text-sm sm:text-base font-bold text-gray-700 min-w-0">
                    {item.title}
                  </h3>

                  {/* NEW */}
                  {item.isNew && (
                    <span className="shrink-0 text-[10px] font-bold text-white bg-red-400 px-2 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default News;
