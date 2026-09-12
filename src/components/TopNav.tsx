'use client';

import Image from 'next/image';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

interface TopNavProps {
  userName?: string;
  role?: string;
}

export default function TopNav({ userName, role }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" dir="rtl">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-amber-500/30 shadow-md">
            <Image
              src="/icon.png"
              alt="One Step Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-slate-200">
              One Step
            </span>
            <span className="text-[10px] text-amber-400/80 -mt-1 font-medium">الأكاديمية</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {userName && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">مرحباً بك،</p>
              <p className="text-sm font-semibold text-slate-200">{userName}</p>
            </div>
          )}
          {role === 'admin' && (
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              لوحة الإدارة
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}