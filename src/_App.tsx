import React from 'react';
import Header from './components/layout/Header';
import Hero from './components/sections/Hero';
import Story from './components/sections/Story';
import Overview from './components/sections/Overview';
import Footer from './components/layout/Footer';

function App() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-gray-900 font-sans selection:bg-[#c0a062] selection:text-white">
      <Header />
      <Hero />
      <Story />
      
      <Overview />
      <Footer />
    </div>
  );
}

export default App;