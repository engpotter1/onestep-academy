"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

const YEARS = [
  { value: "1st Year", label: "الفرقة الأولى (1st Year)" },
  { value: "2nd Year", label: "الفرقة الثانية (2nd Year)" },
  { value: "3rd Year", label: "الفرقة الثالثة (3rd Year)" },
  { value: "4th Year", label: "الفرقة الرابعة (4th Year)" },
  { value: "Graduate", label: "خريج (Graduate)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    universityEmail: "",
    personalEmail: "",
    phoneNumber: "",
    academicYear: YEARS[0].value,
    password: "",
    confirmPassword: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const passwordScore = scorePassword(form.password);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // التحقق من صحة رقم الهاتف المصري
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(form.phoneNumber.trim())) {
      setError("يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً (مثال: 01012345678).");
      return;
    }

    if (form.password.length < 8) {
      setError("يجب أن تكون كلمة المرور 8 أحرف على الأقل.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    if (!form.universityEmail.trim().toLowerCase().endsWith(".edu") && !form.universityEmail.trim().toLowerCase().includes(".edu.")) {
      setError("يرجى استخدام البريد الجامعي الرسمي الذي يحتوي على (.edu).");
      return;
    }

    if (!agreedToTerms) {
      setError("يرجى الموافقة على شروط وسياسة المنصة للمتابعة.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.personalEmail.trim(),
      password: form.password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: form.fullName.trim(),
      university_email: form.universityEmail.trim(),
      personal_email: form.personalEmail.trim(),
      phone_number: form.phoneNumber.trim(),
      academic_year: form.academicYear,
    });

    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      className="relative min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center px-4 py-12 overflow-hidden"
      dir="rtl"
    >
      <div className="absolute inset-0 math-grid-bg pointer-events-none z-0" />
      <div className="absolute -top-32 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-8 flex flex-col items-center">
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

          <h1 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-slate-200">
            One Step
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md leading-relaxed">
            إنشاء حساب طالب جديد — يبدأ الحساب في وضع الانتظار لحين مراجعته وتفعيله من قِبل إدارة الأكاديمية.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl"
        >
          <Field label="الاسم بالكامل (عربي / إنجليزي)">
            <input
              required
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className={inputClass}
              placeholder="مثال: أحمد محمد علي"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Field label="البريد الجامعي (.edu)">
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={form.universityEmail}
                  onChange={(e) => update("universityEmail", e.target.value)}
                  className={`${inputClass} text-left`}
                  placeholder="student@university.edu"
                />
              </Field>
              <p className="text-[11px] text-amber-400/80 mt-1 font-medium">
                * مخصص لإثبات القيد الدراسي
              </p>
            </div>

            <div>
              <Field label="البريد الشخصي (للدخول والمراسلات)">
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={form.personalEmail}
                  onChange={(e) => update("personalEmail", e.target.value)}
                  className={`${inputClass} text-left`}
                  placeholder="name@gmail.com"
                />
              </Field>
              <p className="text-[11px] text-slate-400 mt-1">
                * الحساب الأساسي لتسجيل الدخول
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="رقم الهاتف المحمول">
              <input
                required
                type="tel"
                dir="ltr"
                autoComplete="new-password"
                autoCorrect="off"
                value={form.phoneNumber}
                onChange={(e) => update("phoneNumber", e.target.value)}
                className={`${inputClass} text-left`}
                placeholder="010XXXXXXXX"
              />
            </Field>

            <Field label="السنة الدراسية">
              <select
                value={form.academicYear}
                onChange={(e) => update("academicYear", e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {YEARS.map((y) => (
                  <option key={y.value} value={y.value} className="bg-slate-900 text-slate-100">
                    {y.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <Field label="كلمة المرور">
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className={`${inputClass} text-left pl-10`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs select-none"
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
                <PasswordStrength score={passwordScore} />
              </Field>
            </div>

            <div>
              <Field label="تأكيد كلمة المرور">
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    minLength={8}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    className={`${inputClass} text-left`}
                    placeholder="••••••••"
                  />
                </div>
              </Field>
              {form.confirmPassword.length > 0 && (
                <p className={`text-[11px] mt-1 font-medium ${passwordsMatch ? "text-emerald-400" : "text-rose-400"}`}>
                  {passwordsMatch ? "✓ كلمتا المرور متطابقتان" : "✕ كلمتا المرور غير متطابقتين"}
                </p>
              )}
            </div>
          </div>

          {/* إقرار الشروط والخصوصية */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                أقر بأن جميع البيانات صحيحة، وأن الحساب شخصي ومخصص لي فقط، وتخضع جميع المحاضرات لحماية المحتوى والعلامات المائية الرقمية.
              </span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (form.confirmPassword.length > 0 && !passwordsMatch) || !agreedToTerms}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold py-3 text-sm hover:opacity-95 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>

          <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-amber-300 hover:text-amber-200 font-semibold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl bg-slate-900/80 border border-white/10 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ["قصيرة جداً", "ضعيفة", "مقبولة", "جيدة", "قوية وممتازة"];
  const colors = ["#475569", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score] : "#1e293b" }}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-slate-400 w-20 text-left">{labels[score]}</span>
    </div>
  );
}