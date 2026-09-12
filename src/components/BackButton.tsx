"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallback = "/admin", label = "رجوع" }: { fallback?: string; label?: string }) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-xs text-nh-muted hover:text-white transition group shadow-sm active:scale-95 cursor-pointer"
    >
      <span className="text-sm transition-transform group-hover:translate-x-1">→</span>
      <span>{label}</span>
    </button>
  );
}