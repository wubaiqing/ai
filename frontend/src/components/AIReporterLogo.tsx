import React from 'react';

interface AIReporterLogoProps {
  className?: string;
  size?: number;
  responsive?: boolean;
}

const AIReporterLogo: React.FC<AIReporterLogoProps> = ({ className = '', size = 32, responsive = true }) => {
  return (
    <div className={`flex items-center ${responsive ? 'space-x-2 sm:space-x-3' : 'space-x-3'} ${className}`}>
      {/* AI Icon */}
      <div className="relative">
        <svg
          width={responsive ? 'auto' : size}
          height={responsive ? 'auto' : size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 hover:scale-110 ${responsive ? 'w-6 h-6 sm:w-8 sm:h-8' : ''}`}
        >
          {/* Background Circle with Gradient */}
          <defs>
            <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          
          {/* Main Circle */}
          <circle
            cx="16"
            cy="16"
            r="15"
            fill="url(#aiGradient)"
            stroke="#1E40AF"
            strokeWidth="1"
          />
          
          {/* Circuit Pattern */}
          <g stroke="url(#circuitGradient)" strokeWidth="1.5" fill="none">
            {/* Horizontal Lines */}
            <line x1="6" y1="12" x2="14" y2="12" />
            <line x1="18" y1="12" x2="26" y2="12" />
            <line x1="6" y1="20" x2="14" y2="20" />
            <line x1="18" y1="20" x2="26" y2="20" />
            
            {/* Vertical Lines */}
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="20" y1="8" x2="20" y2="16" />
            <line x1="12" y1="16" x2="12" y2="24" />
            <line x1="20" y1="16" x2="20" y2="24" />
            
            {/* Connection Nodes */}
            <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
            <circle cx="20" cy="12" r="1.5" fill="#FFFFFF" />
            <circle cx="12" cy="20" r="1.5" fill="#FFFFFF" />
            <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
          </g>
          
          {/* AI Text in Center */}
          <text
            x="16"
            y="18"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FFFFFF"
            fontFamily="Arial, sans-serif"
          >
            AI
          </text>
        </svg>
      </div>
      
      {/* Text Logo */}
      <div className="flex items-center space-x-1">
        <span className={`font-bold text-blue-600 hover:text-blue-700 transition-colors duration-300 ${responsive ? 'text-lg sm:text-xl' : 'text-xl'}`}>
          AI
        </span>
        <span className={`font-semibold text-gray-800 hover:text-gray-900 transition-colors duration-300 ${responsive ? 'text-lg sm:text-xl' : 'text-xl'} ${responsive ? 'hidden xs:inline' : ''}`}>
          Reporter
        </span>
      </div>
    </div>
  );
};

export default AIReporterLogo;