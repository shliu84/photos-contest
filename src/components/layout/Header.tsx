import React from 'react';
import { PawPrint } from 'lucide-react';

interface HeaderProps {
    onNavigateToHome: () => void;
    onNavigateToSubmit: () => void;
}

const Header: React.FC<HeaderProps> = ({
    onNavigateToHome,
    onNavigateToSubmit,
}) => {
    const goHomeAndScroll = (id: string) => {
        onNavigateToHome();
        setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 0);
    };

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={onNavigateToHome}
                    className="flex items-center gap-2"
                >
                    <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">
                        <PawPrint size={16} />
                    </div>
                    <span className="font-bold text-lg">PANDA MEMORIES</span>
                </button>

                {/* Nav */}
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => {
                            onNavigateToHome();
                            setTimeout(() => {
                                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                            }, 0);
                        }}
                    >
                        TOP
                    </button>
                    <button onClick={() => goHomeAndScroll('about')}>企画背景</button>
                    <button onClick={() => goHomeAndScroll('guidelines')}>募集要項</button>
                    <button
                        onClick={onNavigateToSubmit}
                        className="bg-black text-white px-4 py-2 rounded-full"
                    >
                        投稿する
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Header;
