import { Heart } from 'lucide-react';

const Story = () => (
  <section id="about" className="py-28 bg-white relative overflow-hidden">
    {/* 装饰性背景圆 */}
    <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

    <div className="max-w-3xl mx-auto px-6 relative z-10">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-400 rounded-full mb-6">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">企画に込めた想い</h2>
        <div className="w-12 h-1.5 bg-[#c0a062] mx-auto rounded-full opacity-50"></div>
      </div>

      <div className="space-y-10 text-gray-600 leading-loose text-lg font-medium">
        <p>
          2026年1月末、上野動物園のシャオシャオとレイレイが中国へ返還され、
          <span className="bg-yellow-100/50 px-1 rounded">日本国内からパンダがいなくなる</span>という、歴史的な節目を迎えました。
        </p>
        <p>
          日本でパンダと共に過ごした半世紀余りの時間、そこに重ねられてきた世代を超えた人々の感情や記憶を、
          写真とエピソードとして記録・保存したいとの思いから、
          <span className="text-gray-900 font-bold">「わたしとパンダ」</span>写真コンテストを開催する運びとなりました。
        </p>
        <p>
          本コンテストの受賞作品は、雑誌『和華』の特別号に掲載され、中国のパンダ関連機構へ贈呈される予定です。
          日中文化交流の証として、あなたの想いを後世に残しませんか。
        </p>
      </div>
    </div>
  </section>
);

export default Story;