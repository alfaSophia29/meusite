
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | string;
  variant?: string;
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", variant, onClick }) => {
  const isWhite = variant === 'white';
  
  // Theme-aware color classes using tailwind variables defined in index.css
  const faceColorClass = isWhite ? 'text-white' : 'text-brand';
  const phoneColorClass = isWhite ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <div 
      className={`flex items-center cursor-pointer select-none group relative transition-transform duration-300 active:scale-95 -mt-2 md:-mt-3 ${className}`} 
      onClick={onClick}
    >
      <div className="relative flex flex-col items-center select-none">
        {/* FacePhone Text: Perfectly seated on the bar */}
        <div className="flex font-black tracking-tighter leading-none items-baseline gap-0.5 relative z-10 transition-transform duration-300 group-hover:scale-105">
          <span className={`${faceColorClass} text-xl md:text-2xl lg:text-3xl drop-shadow-sm`}>Face</span>
          <span className={`${phoneColorClass} text-xl md:text-2xl lg:text-3xl`}>Phone</span>
        </div>

        {/* The "Exactly" Curvy Bar: Restored wavy style with asymmetric curves */}
        <div className={`relative w-[130%] h-[2px] -mt-[13px] md:-mt-[16px] lg:-mt-[20px] ${faceColorClass}`}>
          <svg 
            viewBox="0 0 120 30" 
            className="absolute left-1/2 -translate-x-1/2 top-0 w-full h-[1200%] overflow-visible"
            preserveAspectRatio="none"
          >
            <path 
              d="M0,25 C0,10 15,10 25,10 L95,10 C105,10 120,10 120,-5" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              fill="none" 
              strokeLinecap="round"
              className="transition-all duration-500 group-hover:stroke-[3.5] drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
            />
            {/* Elegant accent line for high-end finish */}
            <path 
              d="M25,10 L95,10" 
              stroke="white" 
              strokeWidth="0.8" 
              strokeLinecap="round"
              opacity="0.3"
              className="pointer-events-none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Logo;
