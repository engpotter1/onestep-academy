"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      setLoading(false);
      return;
    }

    // Single-session enforcement: stamp a fresh session id on this login,
    // invalidating any session open elsewhere.
    await supabase
      .from("profiles")
      .update({ active_session_id: crypto.randomUUID() })
      .eq("id", data.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <main
      className="relative min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center px-4 overflow-hidden"
      dir="rtl"
    >
      {/* خلفية جمالية متوافقة مع الصفحة الرئيسية */}
      <div className="absolute inset-0 math-grid-bg pointer-events-none z-0" />
      <div className="absolute -top-24 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Header اللوجو والعنوان */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link href="/" className="inline-block group mb-3">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform">
              <Image
                src="/icon.png"
                alt="One Step Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </Link>

          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-slate-200">
            One Step
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تسجيل الدخول إلى حسابك الأكاديمي
          </p>
        </div>

        {/* نموذج الدخول */}
        <form
          onSubmit={handleSubmit}
          className="glass-card border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl"
        >
          <label className="block">
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">
              البريد الإلكتروني
            </span>
            <input
              required
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all text-left"
              dir="ltr"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور
            </span>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900/80 border border-white/10 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all text-left"
              dir="ltr"
            />
          </label>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold py-2.5 text-sm hover:opacity-95 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>

          <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            ليس لديك حساب بعد؟{" "}
            <Link
              href="/register"
              className="text-amber-300 hover:text-amber-200 font-semibold hover:underline"
            >
              إنشاء حساب جديد
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}