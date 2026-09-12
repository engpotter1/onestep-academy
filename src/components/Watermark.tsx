'use client';

import { useEffect, useState } from 'react';

interface WatermarkProps {
  studentName: string;
  studentPhone: string;
}

export default function Watermark({ studentName, studentPhone }: WatermarkProps) {
  const [coords, setCoords] = useState({ top: 20, left: 20 });

  useEffect(() => {
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 80) + 10;
      const randomLeft = Math.floor(Math.random() * 80) + 10;
      setCoords({ top: randomTop, left: randomLeft });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="pointer-events-none absolute select-none z-50 transition-all duration-1000 ease-in-out font-mono font-bold tracking-wider"
      style={{
        top: `${coords.top}%`,
        left: `${coords.left}%`,
        opacity: 0.28,
        color: '#ffffff',
        textShadow: '0 0 4px #000000',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <div className="text-xs md:text-sm transform -rotate-12 bg-black/20 px-2 py-1 rounded backdrop-blur-[1px]">
        <span>{studentName}</span> | <span>{studentPhone}</span>
      </div>
    </div>
  );
}