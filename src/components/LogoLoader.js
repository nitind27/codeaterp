'use client';

export default function LogoLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="relative flex flex-col items-center">
        
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-96 h-96 bg-[#1A656D]/10 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>

        {/* Logo Container */}
        <div className="relative z-10 flex flex-col items-center">
          
          {/* Main Logo SVG - Network Globe Design */}
          <div className="relative mb-8">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 bg-[#1A656D]/15 rounded-full blur-2xl animate-glow"></div>
            </div>
            
            <svg 
              className="w-72 h-72 relative z-10" 
              viewBox="0 0 200 200" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradient for lighter cyan paths */}
                <linearGradient id="cyanLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3BA5AD"/>
                  <stop offset="100%" stopColor="#2A8F9A"/>
                </linearGradient>
                
                {/* Gradient for medium teal paths */}
                <linearGradient id="tealMedium" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1A656D"/>
                  <stop offset="100%" stopColor="#2A8F9A"/>
                </linearGradient>
                
                {/* Gradient for darker teal paths */}
                <linearGradient id="tealDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#155958"/>
                  <stop offset="100%" stopColor="#0d4a49"/>
                </linearGradient>
                
                {/* Very dark teal for depth */}
                <linearGradient id="tealDeep" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#164e63"/>
                  <stop offset="100%" stopColor="#0c4a6e"/>
                </linearGradient>
                
                {/* Gradient for CI text */}
                <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="50%" stopColor="#e2e8f0"/>
                  <stop offset="100%" stopColor="#94a3b8"/>
                </linearGradient>
                
                {/* Glow filter for nodes */}
                <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* === OUTER CURVED ARCS - Main globe structure === */}
              
              {/* Top-left to left curved arc */}
              <path 
                d="M58 28 C35 45, 22 70, 22 100"
                stroke="url(#tealMedium)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Left to bottom-left curved arc */}
              <path 
                d="M22 100 C22 130, 35 155, 58 172"
                stroke="url(#tealDark)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Top-right to right curved arc */}
              <path 
                d="M142 28 C165 45, 178 70, 178 100"
                stroke="url(#tealMedium)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Right to bottom-right curved arc */}
              <path 
                d="M178 100 C178 130, 165 155, 142 172"
                stroke="url(#tealDark)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Top horizontal arc - left to center */}
              <path 
                d="M58 28 C75 18, 90 15, 100 15"
                stroke="url(#cyanLight)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Top horizontal arc - center to right */}
              <path 
                d="M100 15 C110 15, 125 18, 142 28"
                stroke="url(#cyanLight)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Bottom horizontal arc - left to center */}
              <path 
                d="M58 172 C75 182, 90 185, 100 185"
                stroke="url(#tealDark)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Bottom horizontal arc - center to right */}
              <path 
                d="M100 185 C110 185, 125 182, 142 172"
                stroke="url(#tealDark)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* === INNER CURVED CONNECTIONS === */}
              
              {/* Top-left inner curve to center-right */}
              <path 
                d="M45 42 C60 50, 80 65, 95 78 C110 65, 130 52, 148 48"
                stroke="url(#cyanLight)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Bottom-left inner curve to center-right */}
              <path 
                d="M45 158 C60 150, 80 135, 95 122 C110 135, 130 148, 148 152"
                stroke="url(#tealMedium)" 
                strokeWidth="2" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Left vertical inner arc */}
              <path 
                d="M45 42 C38 60, 35 80, 35 100 C35 120, 38 140, 45 158"
                stroke="url(#tealDeep)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Right vertical inner arc */}
              <path 
                d="M148 48 C158 65, 162 82, 162 100 C162 118, 158 135, 148 152"
                stroke="url(#tealDeep)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Inner cross curve - top to bottom through left */}
              <path 
                d="M70 32 C55 55, 50 78, 55 100 C50 122, 55 145, 70 168"
                stroke="url(#tealDark)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Inner cross curve - top to bottom through right */}
              <path 
                d="M130 32 C145 55, 150 78, 145 100 C150 122, 145 145, 130 168"
                stroke="url(#tealDark)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Horizontal inner curve - left side */}
              <path 
                d="M32 75 C45 68, 60 65, 75 70"
                stroke="url(#tealMedium)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Horizontal inner curve - right side top */}
              <path 
                d="M125 70 C140 65, 155 68, 168 75"
                stroke="url(#tealMedium)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Horizontal inner curve - left side bottom */}
              <path 
                d="M32 125 C45 132, 60 135, 75 130"
                stroke="url(#tealDark)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Horizontal inner curve - right side bottom */}
              <path 
                d="M125 130 C140 135, 155 132, 168 125"
                stroke="url(#tealDark)" 
                strokeWidth="1.8" 
                fill="none"
                strokeLinecap="round"
                className="animate-arc"
              />
              
              {/* Small connecting curves */}
              <path 
                d="M75 70 C85 75, 90 82, 90 92"
                stroke="url(#tealDeep)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path 
                d="M125 70 C115 75, 110 82, 110 92"
                stroke="url(#tealDeep)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path 
                d="M75 130 C85 125, 90 118, 90 108"
                stroke="url(#tealDeep)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path 
                d="M125 130 C115 125, 110 118, 110 108"
                stroke="url(#tealDeep)" 
                strokeWidth="1.5" 
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
              
              {/* === NETWORK NODES === */}
              <g filter="url(#nodeGlow)">
                {/* Main outer nodes - Top */}
                <circle cx="100" cy="15" r="5" fill="#38bdf8" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="58" cy="28" r="5" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="0.2s"/>
                </circle>
                <circle cx="142" cy="28" r="5" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="0.4s"/>
                </circle>
                
                {/* Main outer nodes - Sides */}
                <circle cx="22" cy="100" r="5" fill="#38bdf8" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="0.6s"/>
                </circle>
                <circle cx="178" cy="100" r="5" fill="#38bdf8" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="0.8s"/>
                </circle>
                
                {/* Main outer nodes - Bottom */}
                <circle cx="100" cy="185" r="5" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="1s"/>
                </circle>
                <circle cx="58" cy="172" r="5" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="1.2s"/>
                </circle>
                <circle cx="142" cy="172" r="5" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="4;6;4" dur="2.5s" repeatCount="indefinite" begin="1.4s"/>
                </circle>
                
                {/* Inner nodes - Upper */}
                <circle cx="45" cy="42" r="4.5" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="3.5;5.5;3.5" dur="2.8s" repeatCount="indefinite" begin="0.3s"/>
                </circle>
                <circle cx="148" cy="48" r="4.5" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="3.5;5.5;3.5" dur="2.8s" repeatCount="indefinite" begin="0.5s"/>
                </circle>
                <circle cx="70" cy="32" r="4" fill="#06b6d4" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" begin="0.35s"/>
                </circle>
                <circle cx="130" cy="32" r="4" fill="#06b6d4" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" begin="0.55s"/>
                </circle>
                
                {/* Inner nodes - Lower */}
                <circle cx="45" cy="158" r="4.5" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="3.5;5.5;3.5" dur="2.8s" repeatCount="indefinite" begin="1.3s"/>
                </circle>
                <circle cx="148" cy="152" r="4.5" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="3.5;5.5;3.5" dur="2.8s" repeatCount="indefinite" begin="1.5s"/>
                </circle>
                <circle cx="70" cy="168" r="4" fill="#0e7490" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" begin="1.35s"/>
                </circle>
                <circle cx="130" cy="168" r="4" fill="#0e7490" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite" begin="1.55s"/>
                </circle>
                
                {/* Side inner nodes */}
                <circle cx="32" cy="75" r="4" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="2.8s" repeatCount="indefinite" begin="0.7s"/>
                </circle>
                <circle cx="168" cy="75" r="4" fill="#22d3ee" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="2.8s" repeatCount="indefinite" begin="0.9s"/>
                </circle>
                <circle cx="32" cy="125" r="4" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="2.8s" repeatCount="indefinite" begin="1.1s"/>
                </circle>
                <circle cx="168" cy="125" r="4" fill="#0891b2" className="animate-node">
                  <animate attributeName="r" values="3;5;3" dur="2.8s" repeatCount="indefinite" begin="1.3s"/>
                </circle>
                
                {/* Center area nodes */}
                <circle cx="75" cy="70" r="3.5" fill="#0e7490" className="animate-node-inner">
                  <animate attributeName="r" values="2.5;4.5;2.5" dur="3s" repeatCount="indefinite" begin="0.4s"/>
                </circle>
                <circle cx="125" cy="70" r="3.5" fill="#0e7490" className="animate-node-inner">
                  <animate attributeName="r" values="2.5;4.5;2.5" dur="3s" repeatCount="indefinite" begin="0.6s"/>
                </circle>
                <circle cx="75" cy="130" r="3.5" fill="#155e75" className="animate-node-inner">
                  <animate attributeName="r" values="2.5;4.5;2.5" dur="3s" repeatCount="indefinite" begin="1.4s"/>
                </circle>
                <circle cx="125" cy="130" r="3.5" fill="#155e75" className="animate-node-inner">
                  <animate attributeName="r" values="2.5;4.5;2.5" dur="3s" repeatCount="indefinite" begin="1.6s"/>
                </circle>
              </g>
              
              {/* Center dark circle background for CI */}
              <circle 
                cx="100" cy="100" r="28"
                fill="#000000"
              />
              
              {/* CI Text in center */}
              <text 
                x="100" y="108" 
                fontFamily="Arial, sans-serif" 
                fontSize="24" 
                fontWeight="bold" 
                fill="url(#textGradient)" 
                textAnchor="middle"
                className="animate-text-pulse"
              >
                CI
              </text>
            </svg>
          </div>

          {/* Company Name - Codeat */}
          <div className="text-center animate-fade-in">
            <div className="flex items-center justify-center mb-1">
              {/* C in dark blue - matching logo style */}
              <span className="text-5xl font-black text-[#2d4a6f] tracking-tight" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>C</span>
              {/* odeat in silver/white gradient */}
              <span className="text-5xl font-black bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 bg-clip-text text-transparent tracking-tight" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>odeat</span>
            </div>
            
            {/* INFOTECH */}
            <div className="text-base tracking-[0.35em] bg-gradient-to-r from-slate-400 via-[#2A8F9A] to-slate-400 bg-clip-text text-transparent font-bold uppercase">
              INFOTECH
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex gap-2 mt-10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1A656D] animate-bounce-dot" style={{animationDelay: '0ms'}}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1A656D] animate-bounce-dot" style={{animationDelay: '150ms'}}></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#1A656D] animate-bounce-dot" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        /* Arc pulse animation */
        @keyframes arc-pulse {
          0%, 100% { 
            opacity: 0.9;
            filter: drop-shadow(0 0 2px rgba(34, 211, 238, 0.3));
          }
          50% { 
            opacity: 1;
            filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.5));
          }
        }
        
        /* Node glow animation */
        @keyframes node-pulse {
          0%, 100% { 
            opacity: 0.85;
            filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.5));
          }
          50% { 
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.8));
          }
        }
        
        /* Inner node animation */
        @keyframes node-inner-pulse {
          0%, 100% { 
            opacity: 0.7;
            filter: drop-shadow(0 0 2px rgba(14, 116, 144, 0.4));
          }
          50% { 
            opacity: 1;
            filter: drop-shadow(0 0 6px rgba(14, 116, 144, 0.7));
          }
        }
        
        /* Text pulse animation */
        @keyframes text-pulse {
          0%, 100% { 
            filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.2));
          }
          50% { 
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
          }
        }
        
        /* Fade in animation */
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        /* Bounce animation for dots */
        @keyframes bounce-dot {
          0%, 100% { 
            transform: translateY(0);
            opacity: 0.5;
          }
          50% { 
            transform: translateY(-10px);
            opacity: 1;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
        
        .animate-arc {
          animation: arc-pulse 3s ease-in-out infinite;
        }
        
        .animate-node {
          animation: node-pulse 2.5s ease-in-out infinite;
        }
        
        .animate-node-inner {
          animation: node-inner-pulse 3s ease-in-out infinite;
        }
        
        .animate-text-pulse {
          animation: text-pulse 2.5s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-bounce-dot {
          animation: bounce-dot 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
