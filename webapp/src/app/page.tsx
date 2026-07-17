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
        <div className="pt-6 pb-16 flex flex-col items-center gap-6">
          <Link href="/login" className="group relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-300 ease-in-out bg-[#1E88E5] rounded-full hover:bg-[#1565C0] hover:scale-105 hover:shadow-[0_0_40px_rgba(30,136,229,0.4)]">
            <span className="absolute inset-0 rounded-full border border-white/20"></span>
            <span className="text-lg tracking-wide">Enter Dashboard</span>
            <svg className="w-5 h-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </Link>
          
          <div className="flex items-center justify-center gap-6 mt-1">
             <a 
                href="https://extension.unfugly.app" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Chrome Extension"
                className="text-gray-400 hover:text-[#1E88E5] transition-all flex items-center gap-2 text-sm font-semibold hover:scale-105"
             >
                <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor">
                   <path d="M464 128h-80V80c0-44.18-35.82-80-80-80s-80 35.82-80 80v48h-80c-26.51 0-48 21.49-48 48v80H48c-26.51 0-48 21.49-48 48s21.49 48 48 48h48v80c0 26.51 21.49 48 48 48h80v48c0 44.18 35.82 80 80 80s80-35.82 80-80v-48h80c26.51 0 48-21.49 48-48v-80h48c26.51 0 48-21.49 48-48s-21.49-48-48-48h-48v-80c0-26.51-21.49-48-48-48z"/>
                </svg>
                <span>Chrome Extension</span>
             </a>
             <span className="text-white/10 text-sm">|</span>
             <a 
                href="https://chat.whatsapp.com/GlmnZ3g0Zb8IXFTa3tOImT" 
                target="_blank" 
                rel="noopener noreferrer"
                title="WhatsApp Community"
                className="text-gray-400 hover:text-[#25D366] transition-all flex items-center gap-2 text-sm font-semibold hover:scale-105"
             >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.019 14.12 1.01 11.52 1.01c-5.448 0-9.873 4.37-9.878 9.802-.002 1.743.46 3.447 1.34 4.954l-.99 3.614 3.655-.958zm12.335-5.464c-.302-.15-1.786-.882-2.07-.987-.282-.104-.489-.156-.694.15-.205.307-.795.987-.975 1.191-.18.205-.359.23-.66.08-1.597-.799-2.617-1.436-3.666-3.235-.278-.475.278-.44.795-1.474.086-.174.043-.326-.021-.475-.065-.15-.544-1.309-.745-1.792-.195-.47-.393-.406-.54-.413-.14-.007-.301-.008-.461-.008-.161 0-.422.06-.643.302-.221.241-.844.824-.844 2.01 0 1.185.864 2.33 1.025 2.502.161.171 1.7 2.593 4.12 3.633.576.248 1.025.395 1.376.507.579.183 1.106.157 1.522.095.464-.069 1.487-.607 1.695-1.191.208-.585.208-1.087.146-1.191-.063-.105-.23-.156-.53-.307z"/>
                </svg>
                <span>WhatsApp Community</span>
             </a>
          </div>
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
