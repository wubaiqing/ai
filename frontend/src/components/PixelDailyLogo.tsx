import React from 'react';

interface PixelDailyLogoProps {
  className?: string;
  size?: number;
  responsive?: boolean;
}

const PixelDailyLogo: React.FC<PixelDailyLogoProps> = ({ className = '', size = 32, responsive = true }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.png"
        alt="像素简报"
        className={`transition-transform duration-300 hover:scale-110 object-contain ${
          responsive ? 'h-8 w-auto sm:h-10' : `h-${size} w-auto`
        }`}
      />
    </div>
  );
};

export default PixelDailyLogo;