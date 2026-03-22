import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-bg">
      {/* Background blobs for a modern feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent2/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="z-10 text-center space-y-8 max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent2 mb-6">
          Unfugly
        </h1>
        
        <p className="text-xl md:text-2xl text-muted font-light">
          Your SRM Academia experience, radically simplified.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left my-12">
          <div className="card bg-surface/80 backdrop-blur-md">
            <h3 className="text-lg font-bold text-text mb-2 flex items-center">
              <span className="text-2xl mr-2">⚡</span> Fast
            </h3>
            <p className="text-sm text-muted">Data securely scraped and cached locally for instant access whenever you need it.</p>
          </div>
          <div className="card bg-surface/80 backdrop-blur-md">
            <h3 className="text-lg font-bold text-text mb-2 flex items-center">
              <span className="text-2xl mr-2">📊</span> Smart
            </h3>
            <p className="text-sm text-muted">Intelligent attendance margin calculation helps you plan exactly when you can bunk.</p>
          </div>
          <div className="card bg-surface/80 backdrop-blur-md">
            <h3 className="text-lg font-bold text-text mb-2 flex items-center">
              <span className="text-2xl mr-2">🎨</span> Beautiful
            </h3>
            <p className="text-sm text-muted">A modern, dark-themed UI that doesn't hurt your eyes. Edit timetable slots seamlessly.</p>
          </div>
        </div>

        <div className="pt-4">
          <Link href="/login" className="btn-primary inline-flex items-center text-lg px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-accent/20 transition-all hover:scale-105">
            Get Started
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
