'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Splash() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // إخفاء السبلاش بعد اكتمال التحميل أو بعد 2.4 ثانية
    const timerFade = setTimeout(() => setFade(true), 2100);
    const timerRemove = setTimeout(() => setVisible(false), 2700);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerRemove);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030712] transition-opacity duration-700 select-none ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      dir="rtl"
    >
      {/* خلفية الإشعاع الذهبي والنيلي */}
      <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute w-64 h-64 bg-indigo-600/15 rounded-full blur-[90px]" />

      {/* دائرة الطاقة الخارجية حول اللوجو */}
      <div className="relative flex items-center justify-center mb-6">
        {/* هالة دائرية دوارة */}
        <div className="absolute -inset-3 rounded-full border-2 border-transparent border-t-amber-400/80 border-r-amber-500/20 border-b-transparent border-l-amber-400/40 animate-spin [animation-duration:3s]" />
        
        {/* دائرة نيون ثابتة */}
        <div className="relative w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-amber-200 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <div className="relative w-full h-full rounded-full overflow-hidden bg-[#030712]">
            <Image
              src="/icon.png"
              alt="One Step"
              fill
              className="object-cover transform scale-95"
              priority
            />
          </div>
        </div>
      </div>

      {/* اسم المنصة مع تأثير التدرج المتحرك */}
      <div className="text-center space-y-1.5 z-10">
        <h1 className="text-3xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-sm font-sans">
          ONE STEP
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-widest font-mono uppercase">
          NH Math Academy
        </p>
      </div>

      {/* شريط التحميل الكرييتف السفلي */}
      <div className="w-44 h-1 bg-slate-800/80 rounded-full overflow-hidden mt-8 border border-white/5">
        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full animate-[shimmer_1.8s_ease-in-out_infinite] w-full" />
      </div>
    </div>
  );
}