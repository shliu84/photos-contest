import Hero from "./Hero";
import News from "./News";
import Story from "./Story";
import Overview from "./Overview";

export default function HomePage({ onNavigateToSubmit }: { onNavigateToSubmit: () => void }) {
  return (
    <>
      <Hero onNavigateToSubmit={onNavigateToSubmit} />
      <News />
      <Story />
      <Overview />

      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={onNavigateToSubmit}
          className="bg-[#c0a062] text-white p-4 rounded-full shadow-lg shadow-orange-200 hover:scale-110 transition-transform"
          aria-label="投稿する"
        >
          {/* svg... */}
        </button>
      </div>
    </>
  );
}
