import React from 'react';

const Footer = () => (
  <footer className="py-16 bg-gray-50 text-center border-t border-gray-200">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-2 gap-12 mb-12 text-left">
        <div>
          <h4 className="text-[#c0a062] font-bold mb-4">主催・協力</h4>
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              <strong className="text-gray-900">主催：</strong><br/>
              中国駐東京観光代表処 / 雑誌『和華』
            </p>
            <p>
              <strong className="text-gray-900">特別協力：</strong><br/>
              中国駐大阪観光代表処（申請中）/ 株式会社アジア太平洋観光社
            </p>
          </div>
        </div>
        <div>
           <h4 className="text-[#c0a062] font-bold mb-4">連動企画</h4>
           <ul className="space-y-2 text-sm text-gray-600">
             <li>• 写真コンテスト授賞式・写真展示会 (2026/6/12)</li>
             <li>• 中国四川パンダ誕生日ツアー (2026/6/20-24)</li>
           </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-[#c0a062] transition-colors">利用規約</a>
          <a href="#" className="hover:text-[#c0a062] transition-colors">プライバシーポリシー</a>
        </div>
        <p className="text-gray-400 text-sm">
          © 2026 Panda Photo Contest. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;