"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabaseClient";

type Student = {
  id: string;
  full_name: string;
  university_email: string;
  personal_email: string;
  phone_number: string;
  academic_year: string;
  is_approved: boolean;
  is_locked: boolean;
  created_at: string;
};

type ProgressItem = {
  progress_percent: number;
  last_position_seconds: number;
  is_completed: boolean;
  updated_at: string;
  lecture: {
    id: string;
    title: string;
    chapter: {
      title: string;
      course: {
        title: string;
      } | null;
    } | null;
  } | null;
};

export default function AdminStudentTable({
  initialStudents,
  academicYears,
}: {
  initialStudents: Student[];
  academicYears: string[];
}) {
  const supabase = createClient();
  const [students, setStudents] = useState(initialStudents);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // حالات فتح بروفايل متابعة الطالب
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentProgress, setStudentProgress] = useState<ProgressItem[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // حالة إعادة تعيين كلمة المرور
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesYear = filterYear === "all" || s.academic_year === filterYear;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.university_email?.toLowerCase().includes(q) ||
        s.personal_email?.toLowerCase().includes(q) ||
        s.phone_number?.includes(q);
      return matchesYear && matchesSearch;
    });
  }, [students, filterYear, search]);

  async function toggleApproval(id: string, next: boolean) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, is_approved: next } : s)));
    await supabase.from("profiles").update({ is_approved: next }).eq("id", id);
  }

  async function toggleLock(id: string, next: boolean) {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, is_locked: next } : s)));
    await supabase.from("profiles").update({ is_locked: next }).eq("id", id);
  }

  function batchApprove() {
    if (filterYear === "all") return;
    startTransition(async () => {
      const ids = students.filter((s) => s.academic_year === filterYear).map((s) => s.id);
      setStudents((prev) =>
        prev.map((s) => (s.academic_year === filterYear ? { ...s, is_approved: true } : s))
      );
      await supabase.from("profiles").update({ is_approved: true }).in("id", ids);
    });
  }

  // فتح بروفايل الطالب وجلب سجل المشاهدات
  async function openStudentProfile(student: Student) {
    setSelectedStudent(student);
    setLoadingProgress(true);
    setPasswordStatus(null);
    setNewPassword("");

    const { data } = await supabase
      .from("lecture_progress")
      .select(
        `
        progress_percent,
        last_position_seconds,
        is_completed,
        updated_at,
        lecture:lectures (
          id,
          title,
          chapter:chapters (
            title,
            course:courses (
              title
            )
          )
        )
      `
      )
      .eq("user_id", student.id)
      .order("updated_at", { ascending: false });

    setStudentProgress((data as any) || []);
    setLoadingProgress(false);
  }

  // إعادة تعيين كلمة مرور الطالب
  async function handleResetPassword() {
    if (!selectedStudent || !newPassword.trim()) return;
    setResettingPassword(true);
    setPasswordStatus(null);

    // تحديث كلمة المرور في Auth عبر استدعاء أمني
    const { error } = await supabase.rpc("admin_reset_user_password", {
      target_user_id: selectedStudent.id,
      new_plain_password: newPassword.trim(),
    });

    setResettingPassword(false);
    if (!error) {
      setPasswordStatus("تم تغيير كلمة المرور بنجاح ✅");
      setNewPassword("");
    } else {
      // إرسال بريد إعادة التعيين كخيار بديل مباشر
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(selectedStudent.personal_email);
      if (!resetErr) {
        setPasswordStatus("تم إرسال رابط تعيين كلمة مرور جديدة إلى بريد الطالب ✉️");
      } else {
        setPasswordStatus("تعذر التعيين المباشر، تأكد من تنفيذ دالة الـ RPC.");
      }
    }
  }

  // حساب متوسط نسبة المشاهدة لجميع المحاضرات التي سمعها
  const overallAverage = useMemo(() => {
    if (!studentProgress.length) return 0;
    const total = studentProgress.reduce((sum, item) => sum + (item.progress_percent || 0), 0);
    return Math.round(total / studentProgress.length);
  }, [studentProgress]);

  return (
    <div dir="rtl" className="space-y-5">
      {/* شريط البحث والفلترة */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-nh-card/60 border border-white/5 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، الإيميل الشخصي، الجامعي، أو الهاتف..."
            className="rounded-xl bg-black/60 border border-white/10 px-3.5 py-2 text-xs text-white w-72 focus:outline-none focus:border-amber-500"
          />
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل الفرق الدراسية</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={batchApprove}
          disabled={filterYear === "all" || isPending}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-4 py-2 transition disabled:opacity-30"
        >
          {isPending ? "جاري التفعيل..." : `قبول جميع طلاب "${filterYear === "all" ? "..." : filterYear}"`}
        </button>
      </div>

      {/* جدول بيانات الطلاب */}
      <div className="rounded-2xl border border-white/5 bg-nh-card/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-black/40 text-nh-muted border-b border-white/5 text-right">
              <tr>
                <th className="px-4 py-3.5 font-semibold">الطالب</th>
                <th className="px-4 py-3.5 font-semibold">بيانات الاتصال</th>
                <th className="px-4 py-3.5 font-semibold">الفرقة</th>
                <th className="px-4 py-3.5 font-semibold">الحالة</th>
                <th className="px-4 py-3.5 font-semibold text-left">الإجراءات والمتابعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3.5 font-medium text-white">
                    <button
                      onClick={() => openStudentProfile(s)}
                      className="hover:text-amber-400 text-right font-bold transition flex items-center gap-1.5"
                    >
                      <span>📊</span> {s.full_name}
                    </button>
                    <span className="text-[10px] text-nh-muted block mt-0.5">
                      تاريخ الانضمام: {new Date(s.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-nh-muted space-y-0.5">
                    <div className="text-white/90 font-mono text-[11px]">{s.personal_email}</div>
                    <div className="text-[10px] text-white/50 font-mono">{s.university_email}</div>
                    <div className="text-[11px] text-amber-400 font-mono">{s.phone_number}</div>
                  </td>
                  <td className="px-4 py-3.5 text-white/80">{s.academic_year}</td>
                  <td className="px-4 py-3.5">
                    {s.is_locked ? (
                      <span className="text-red-400 text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                        حساب معلق (Locked)
                      </span>
                    ) : s.is_approved ? (
                      <span className="text-green-400 text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                        مفعل (Approved)
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        بانتظار الموافقة (Pending)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openStudentProfile(s)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition font-medium"
                      >
                        البروفايل والتقدم 📈
                      </button>
                      <button
                        onClick={() => toggleApproval(s.id, !s.is_approved)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 text-white transition"
                      >
                        {s.is_approved ? "إلغاء التفعيل" : "تفعيل"}
                      </button>
                      <button
                        onClick={() => toggleLock(s.id, !s.is_locked)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                      >
                        {s.is_locked ? "فك القفل" : "قفل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-nh-muted text-xs">
                    لا يوجد طلاب يطابقون خيارات البحث الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة بروفايل الطالب التفصيلية ونسب المشاهدة والرسم البياني */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111317] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>👤</span> الملف الشخصي وسجل المشاهدة
                </h3>
                <p className="text-xs text-nh-muted">{selectedStudent.full_name} - {selectedStudent.academic_year}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-nh-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* بطاقة بيانات الطالب الكاملة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 border border-white/5 rounded-xl p-4 text-xs">
              <div>
                <span className="text-nh-muted block text-[10px]">البريد الشخصي (جيميل):</span>
                <span className="font-mono text-white font-medium">{selectedStudent.personal_email}</span>
              </div>
              <div>
                <span className="text-nh-muted block text-[10px]">البريد الجامعي:</span>
                <span className="font-mono text-white font-medium">{selectedStudent.university_email}</span>
              </div>
              <div>
                <span className="text-nh-muted block text-[10px]">رقم الهاتف / واتساب:</span>
                <span className="font-mono text-amber-400 font-bold">{selectedStudent.phone_number}</span>
              </div>
              <div>
                <span className="text-nh-muted block text-[10px]">حالة الحساب:</span>
                <span className="text-white">{selectedStudent.is_approved ? "مفعل ومقبول" : "معلق"}</span>
              </div>
            </div>

            {/* إدارة كلمة المرور (تغيير الباسورد للطالب) */}
            <div className="bg-black/40 border border-amber-500/20 rounded-xl p-4 space-y-2.5">
              <span className="text-xs font-bold text-amber-400 block">🔐 تعيين كلمة مرور جديدة للطالب:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="اكتب كلمة المرور الجديدة (مثال: Pass@2026)..."
                  className="flex-1 rounded-xl bg-black/80 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword || !newPassword.trim()}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 transition disabled:opacity-40"
                >
                  {resettingPassword ? "جاري الحفظ..." : "حفظ الباسورد الجديد"}
                </button>
              </div>
              {passwordStatus && (
                <p className="text-[11px] text-amber-300 pt-1">{passwordStatus}</p>
              )}
            </div>

            {/* تقرير المشاهدة والرسم البياني لتقدم المحاضرات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>📈</span> تقرير نسب مشاهدة المحاضرات
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-nh-muted">متوسط التقدم العام:</span>
                  <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {overallAverage}%
                  </span>
                </div>
              </div>

              {loadingProgress ? (
                <div className="text-center py-8 text-xs text-nh-muted animate-pulse">
                  جاري جلب سجل المشاهدات...
                </div>
              ) : studentProgress.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-nh-muted">
                  لم يبدأ هذا الطالب بمشاهدة أي محاضرة بعد.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {studentProgress.map((item, idx) => {
                    const percent = item.progress_percent || 0;
                    const mins = Math.floor((item.last_position_seconds || 0) / 60);
                    const secs = (item.last_position_seconds || 0) % 60;

                    return (
                      <div
                        key={idx}
                        className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white block">
                              {item.lecture?.title || "محاضرة"}
                            </span>
                            <span className="text-[10px] text-nh-muted">
                              {item.lecture?.chapter?.course?.title} - {item.lecture?.chapter?.title}
                            </span>
                          </div>
                          <div className="text-left font-mono">
                            <span
                              className={`text-xs font-bold ${
                                percent >= 85 ? "text-green-400" : percent >= 40 ? "text-amber-400" : "text-nh-muted"
                              }`}
                            >
                              {percent}%
                            </span>
                            <span className="text-[10px] text-white/40 block">
                              وصل للدقيقة {mins}:{("0" + secs).slice(-2)}
                            </span>
                          </div>
                        </div>

                        {/* شريط الرسم البياني لتقدم المحاضرة */}
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 85
                                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                                : percent >= 40
                                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                : "bg-gradient-to-r from-red-500 to-rose-400"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 text-left">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}