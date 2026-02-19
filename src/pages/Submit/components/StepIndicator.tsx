export const StepIndicator = () => (
  <div className="flex justify-center items-center gap-4 mb-10 text-sm font-bold">
    <div className="flex flex-col items-center text-[#c0a062]">
      <div className="w-8 h-8 rounded-full bg-[#c0a062] text-white flex items-center justify-center mb-1">1</div>
      <span>入力</span>
    </div>
    <div className="w-12 h-0.5 bg-gray-200"></div>
    <div className="flex flex-col items-center text-gray-400">
      <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">2</div>
      <span>確認</span>
    </div>
    <div className="w-12 h-0.5 bg-gray-200"></div>
    <div className="flex flex-col items-center text-gray-400">
      <div className="w-8 h-8 rounded-full bg-gray-200 text-white flex items-center justify-center mb-1">3</div>
      <span>完了</span>
    </div>
  </div>
);