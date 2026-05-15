'use client';

export default function LogoLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030a0b] overflow-hidden">

      {/* ── ambient background orbs ── */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[#1A656D]/8 blur-[120px] animate-[orb1_8s_ease-in-out_infinite]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[#31747c]/6 blur-[100px] animate-[orb2_10s_ease-in-out_infinite]" />

      {/* ── center content ── */}
      <div className="relative flex flex-col items-center gap-10">

        {/* ── spinner stack ── */}
        <div className="relative w-28 h-28 flex items-center justify-center">

          {/* ring 1 — slow outer */}
          <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="50"
              fill="none" stroke="#1A656D" strokeWidth="1.5"
              strokeDasharray="80 235" strokeLinecap="round"
              opacity="0.35"/>
          </svg>

          {/* ring 2 — medium, reverse */}
          <svg className="absolute inset-0 w-full h-full animate-[spin_2s_linear_infinite_reverse]" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="42"
              fill="none" stroke="#31747c" strokeWidth="2"
              strokeDasharray="55 209" strokeLinecap="round"
              opacity="0.5"/>
          </svg>

          {/* ring 3 — fast inner */}
          <svg className="absolute inset-0 w-full h-full animate-[spin_1.2s_linear_infinite]" viewBox="0 0 112 112">
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1A656D" stopOpacity="0"/>
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <circle cx="56" cy="56" r="34"
              fill="none" stroke="url(#arcGrad)" strokeWidth="3"
              strokeDasharray="40 174" strokeLinecap="round"/>
          </svg>

          {/* pulsing dot ring */}
          {[0,60,120,180,240,300].map((deg, i) => (
            <div key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-[#1A656D]"
              style={{
                top: `${50 - 44 * Math.cos(deg * Math.PI / 180)}%`,
                left: `${50 + 44 * Math.sin(deg * Math.PI / 180)}%`,
                transform: 'translate(-50%,-50%)',
                animation: `dotPulse 1.8s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}

          {/* center logo mark */}
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A656D] to-[#0d3337] flex items-center justify-center shadow-[0_0_30px_rgba(26,101,109,0.5)] animate-[logoPulse_2s_ease-in-out_infinite]">
            <span className="text-white font-black text-xl tracking-tight select-none">CI</span>
          </div>
        </div>

        {/* ── brand name ── */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-black text-[#1A656D] tracking-tight">Code</span>
            <span className="text-3xl font-black text-[#F6FBFB] tracking-tight">at</span>
          </div>
          <span className="text-[11px] font-semibold tracking-[0.4em] text-[#8db2b6] uppercase">Infotech</span>
        </div>

        {/* ── progress bar ── */}
        <div className="w-40 h-0.5 rounded-full bg-[#0d3337] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1A656D] via-[#38bdf8] to-[#1A656D] bg-[length:200%_100%] animate-[shimmer_1.5s_linear_infinite]"/>
        </div>

      </div>

      <style>{`
        @keyframes orb1 {
          0%,100% { transform: translate(-120px,-80px) scale(1); }
          50%      { transform: translate(80px,60px) scale(1.15); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(100px,60px) scale(1); }
          50%      { transform: translate(-60px,-80px) scale(0.9); }
        }
        @keyframes dotPulse {
          0%,100% { opacity:0.2; transform:translate(-50%,-50%) scale(0.7); }
          50%      { opacity:1;   transform:translate(-50%,-50%) scale(1.3); }
        }
        @keyframes logoPulse {
          0%,100% { box-shadow: 0 0 20px rgba(26,101,109,0.4); }
          50%      { box-shadow: 0 0 40px rgba(26,101,109,0.7), 0 0 60px rgba(56,189,248,0.2); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
