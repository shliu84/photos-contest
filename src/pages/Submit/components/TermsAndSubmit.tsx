import { Check, Loader2, ChevronRight } from "lucide-react";

interface Props {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  submitting: boolean;
}

export const TermsAndSubmit = ({ agreed, setAgreed, submitting }: Props) => (
  <>
    <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100">
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center pt-1">
          <input type="checkbox" className="peer sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={submitting} />
          <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#c0a062] peer-checked:border-[#c0a062] transition-colors flex items-center justify-center">
            <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
          </div>
        </div>
        <span className="text-sm text-gray-600 leading-relaxed">
          <a href="#" className="text-[#c0a062] font-bold hover:text-black">応募規約</a> および <a href="#" className="text-[#c0a062] font-bold hover:text-black">プライバシーポリシー</a> に同意の上、応募します。
        </span>
      </label>
    </div>

    <div className="text-center">
      <button type="submit" disabled={submitting || !agreed} className={`group relative w-full md:w-2/3 mx-auto px-8 py-4 rounded-full text-lg font-bold text-white flex items-center justify-center gap-3 transition-all duration-300 ${!agreed || submitting ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#dcb773] to-[#c0a062] shadow-[0_10px_30px_-10px_rgba(192,160,98,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(192,160,98,0.7)] hover:-translate-y-1 hover:scale-[1.02]'}`}>
        {submitting ? (
          <><Loader2 className="animate-spin" size={24} /> <span>送信中...</span></>
        ) : (
          <><span>投稿する</span> <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform"><ChevronRight size={20} /></div></>
        )}
      </button>
    </div>
  </>
);