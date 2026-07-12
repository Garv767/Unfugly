import Link from 'next/link';
import { Zap, BarChart3, Rocket } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#1E88E5]/30">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#1E88E5]/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#9c27b0]/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60vw] h-[20vw] bg-[#00bcd4]/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="z-10 text-center space-y-6 max-w-4xl w-full mx-auto px-4">
        
        {/* Hero Headline */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 leading-tight">
          Your student portal, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E88E5] via-[#6c8ef7] to-[#a78bfa] drop-shadow-[0_0_30px_rgba(30,136,229,0.3)]">
            radically simplified.
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed mb-10">
          Fast, smart, and beautiful. Stop fighting with a clunky interface and start enjoying a seamless student experience.
        </p>
        
        {/* CTA Button */}
        <div className="pt-6 pb-16">
          <Link href="/login" className="group relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-300 ease-in-out bg-[#1E88E5] rounded-full hover:bg-[#1565C0] hover:scale-105 hover:shadow-[0_0_40px_rgba(30,136,229,0.4)]">
            <span className="absolute inset-0 rounded-full border border-white/20"></span>
            <span className="text-lg tracking-wide">Enter Dashboard</span>
            <svg className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full relative z-20">
          <div className="bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-[#1E88E5]/50 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Lightning Fast</h3>
            <p className="text-gray-400 leading-relaxed">Data is securely cached. Never wait for an endless loading spinner just to check your schedule again.</p>
          </div>
          
          <div className="bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-[#a78bfa]/50 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Analytics</h3>
            <p className="text-gray-400 leading-relaxed">Intelligent attendance margin calculation helps you plan exactly when it is mathematically safe to bunk.</p>
          </div>
          
          <div className="bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-[#4ade80]/50 group">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Feedback Fastrack</h3>
            <p className="text-gray-400 leading-relaxed">Submit your entire semester's faculty feedback instantly with a single button click. Zero pain.</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
