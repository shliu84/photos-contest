import { Image as ImageIcon } from "lucide-react";
import { BadgeRequired } from "./BadgeRequired";

export const WorkGroupInfo = () => (
  <div className="mb-12">
    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
      <ImageIcon className="text-[#c0a062]" size={24} />
      作品グループ情報
    </h2>
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          作品全体のタイトル（大見出し） <BadgeRequired />
        </label>
        <input name="work_title" type="text" required placeholder="例：パンダの四季" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none" />
      </div>
      <div>
        <div className="flex justify-between items-end mb-2">
          <label className="block text-sm font-bold text-gray-700">全体のエピソード・総評 <BadgeRequired /></label>
          <span className="text-xs text-gray-400">100〜150文字程度</span>
        </div>
        <textarea name="episode" required rows={4} placeholder="この作品群を通して伝えたい思いや、背景を書いてください..." className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none resize-none"></textarea>
      </div>
    </div>
  </div>
);