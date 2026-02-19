import type { ReactNode } from "react";
import { Calendar, Camera, Award } from "lucide-react";

// 内部小组件：圆润的卡片
type RoundCardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

const RoundCard = ({ icon, title, children }: RoundCardProps) => (
  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col items-center text-center">
    <div className="w-16 h-16 bg-[#fffbf5] rounded-full flex items-center justify-center mb-6 text-[#c0a062] group-hover:scale-110 transition-transform shadow-inner">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
    <div className="text-gray-600 w-full text-left bg-[#fcfcfc] p-4 rounded-xl">
      {children}
    </div>
  </div>
);

const Overview = () => (
  <section id="guidelines" className="py-24 bg-[#fffbf5]">
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl font-bold mb-16 text-center text-gray-800">
        開催概要
      </h2>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        <RoundCard icon={<Calendar className="w-8 h-8" />} title="募集期間">
          <p className="leading-relaxed text-sm">
            <strong className="block text-center text-lg text-[#c0a062] mb-1">
              2026年3月6日（金）
            </strong>
            <span className="block text-center text-gray-400 my-1">↓</span>
            <strong className="block text-center text-lg text-[#c0a062] mb-2">
              2026年4月12日（日）
            </strong>
            <span className="text-center text-xs text-gray-400 block mt-2 border-t border-gray-100 pt-2">
              ※期間は変更になる場合があります
            </span>
          </p>
        </RoundCard>

        <RoundCard icon={<Camera className="w-8 h-8" />} title="募集内容">
          <ul className="space-y-3 text-sm text-left">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-yellow-100 text-[#c0a062] flex items-center justify-center text-xs shrink-0">
                1
              </span>
              <div className="flex flex-col">
                <span>パンダの写真</span>
                <span className="text-xs text-gray-400">
                  (年代不問/デジタル・フィルム可)
                </span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-yellow-100 text-[#c0a062] flex items-center justify-center text-xs shrink-0">
                2
              </span>
              100〜150文字のエピソード
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-yellow-100 text-[#c0a062] flex items-center justify-center text-xs shrink-0">
                3
              </span>
              お一人様5枚まで
            </li>
          </ul>
        </RoundCard>

        <RoundCard icon={<Award className="w-8 h-8" />} title="賞の設置">
          <ul className="space-y-4 text-sm text-left">
            <li className="bg-yellow-50/50 p-2 rounded-lg">
              <span className="block text-[#c0a062] font-bold text-xs mb-1">
                最優秀賞・大賞（2名）
              </span>
              賞金 3万円 + <br />
              中国駐東京観光代表処より賞品
            </li>
            <li>
              <span className="block text-gray-800 font-bold text-xs mb-1">
                記念賞（50名）
              </span>
              『和華』第50号特別号への掲載
            </li>
          </ul>
        </RoundCard>
      </div>
    </div>
  </section>
);

export default Overview;
