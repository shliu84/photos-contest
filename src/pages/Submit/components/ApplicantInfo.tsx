import { Check } from "lucide-react";
import { BadgeRequired } from "./BadgeRequired";

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

export const ApplicantInfo = () => {
  // 需要静态下拉也可以，先给常用范围（1900-今年+1）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 2 }, (_, i) => 1900 + i).reverse();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const inputBase =
    "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#c0a062] focus:ring-2 focus:ring-[#c0a062]/20 transition-all outline-none";

  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
        <Check className="text-[#c0a062]" size={24} /> お客様情報
      </h2>

      <p className="text-sm text-gray-500 mb-6">
        ※以下の情報はキャンペーンサイトには公開されません。
      </p>

      <div className="space-y-6">
        {/* お名前 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            お名前 <BadgeRequired />
          </label>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">姓</div>
              <input
                name="last_name"
                type="text"
                required
                placeholder="例）山田"
                className={inputBase}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">名</div>
              <input
                name="first_name"
                type="text"
                required
                placeholder="例）太郎"
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* ふりがな */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ふりがな <BadgeRequired />
          </label>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">せい</div>
              <input
                name="last_name_kana"
                type="text"
                required
                placeholder="例）やまだ"
                className={inputBase}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">めい</div>
              <input
                name="first_name_kana"
                type="text"
                required
                placeholder="例）たろう"
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* 性別 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            性別 <BadgeRequired />
          </label>
          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input name="gender" type="radio" value="male" required />
              男性
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input name="gender" type="radio" value="female" required />
              女性
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input name="gender" type="radio" value="other" required />
              その他/無回答
            </label>
          </div>
        </div>

        {/* 生年月日 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            生年月日 <BadgeRequired />
          </label>

          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <div className="text-xs font-bold text-gray-500 mb-2">西暦</div>
              <select name="birth_year" required className={inputBase}>
                <option value="">年</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <div className="text-xs font-bold text-gray-500 mb-2">月</div>
              <select name="birth_month" required className={inputBase}>
                <option value="">月</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <div className="text-xs font-bold text-gray-500 mb-2">日</div>
              <select name="birth_day" required className={inputBase}>
                <option value="">日</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 text-xs text-gray-400 pb-2">
              年 / 月 / 日
            </div>
          </div>
        </div>

        {/* メールアドレス */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            メールアドレス <BadgeRequired />
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="例）yamada@smartcross.jp（半角英数）"
            className={inputBase}
          />
        </div>

        {/* 郵便番号 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            郵便番号 <BadgeRequired />
          </label>
          <input
            name="postal_code"
            type="text"
            inputMode="numeric"
            pattern="\d{7}"
            required
            placeholder="例）1000005（ハイフンなし、半角数字）"
            className={inputBase}
          />
        </div>

        {/* 都道府県 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            都道府県 <BadgeRequired />
          </label>
          <select name="prefecture" required className={inputBase}>
            <option value="">選択してください</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* 市区町村 番地 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            市区町村 番地 <BadgeRequired />
          </label>
          <input
            name="address_line1"
            type="text"
            required
            placeholder="例）千代田区丸の内1-1-1"
            className={inputBase}
          />
        </div>

        {/* 建物名 部屋番号（任意） */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            建物名 部屋番号
          </label>
          <input
            name="address_line2"
            type="text"
            placeholder="例）丸の内マンション101"
            className={inputBase}
          />
        </div>

        {/* 電話番号（任意） */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            電話番号
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="例）0312345678（ハイフンなし、半角数字）"
            className={inputBase}
          />
        </div>
      </div>
    </div>
  );
};
