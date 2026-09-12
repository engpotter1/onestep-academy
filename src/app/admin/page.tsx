import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import AdminAnnouncements from "@/components/AdminAnnouncements";
import AdminQuestionsDesk from "@/components/AdminQuestionsDesk";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "admin") redirect("/dashboard");

  const [{ count: pendingCount }, { count: totalStudents }, { count: coursesCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("courses").select("*", { count: "exact", head: true }),
    ]);

  const { data: questions } = await supabase
    .from("lesson_questions")
    .select(
      `
      id,
      question_text,
      reply_text,
      created_at,
      lecture:lectures(title),
      student:profiles(full_name, personal_email)
    `
    )
    .order("created_at", { ascending: false });

  const navProps: any = {
    role: "admin",
    fullName: (profile as any)?.full_name ?? "Admin",
    userName: (profile as any)?.full_name ?? "Admin",
    user: profile,
  };

  return (
    <main className="min-h-screen bg-nh-black text-white" dir="rtl">
      <TopNav {...navProps} />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">مركز التحكم</h1>
          <p className="text-xs text-nh-muted mt-1">متابعة نشاط المنصة، الطلاب، واستفسارات المنهج.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-nh-card border border-white/5 p-5">
            <span className="text-xs text-nh-muted block mb-1">الموافقات المعلقة</span>
            <span className="text-3xl font-bold text-amber-400 font-mono">{pendingCount || 0}</span>
          </div>

          <div className="rounded-2xl bg-nh-card border border-white/5 p-5">
            <span className="text-xs text-nh-muted block mb-1">إجمالي الطلاب</span>
            <span className="text-3xl font-bold text-white font-mono">{totalStudents || 0}</span>
          </div>

          <div className="rounded-2xl bg-nh-card border border-white/5 p-5">
            <span className="text-xs text-nh-muted block mb-1">المقررات الدراسية</span>
            <span className="text-3xl font-bold text-white font-mono">{coursesCount || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/students"
            className="rounded-2xl bg-nh-card border border-white/5 hover:border-amber-500/30 p-5 transition block"
          >
            <h3 className="font-bold text-base mb-1">إدارة الطلاب</h3>
            <p className="text-xs text-nh-muted">الموافقة على الحسابات الجديدة وتفعيل دفعات الطلاب.</p>
          </Link>

          <Link
            href="/admin/courses"
            className="rounded-2xl bg-nh-card border border-white/5 hover:border-amber-500/30 p-5 transition block"
          >
            <h3 className="font-bold text-base mb-1">إدارة المناهج والمحاضرات</h3>
            <p className="text-xs text-nh-muted">إنشاء وتعديل المقررات، رفع المذكرات، وضبط الفيديوهات.</p>
          </Link>
        </div>

        <AdminQuestionsDesk initialQuestions={(questions as any) || []} />

        <AdminAnnouncements initialAnnouncements={[]} />
      </div>
    </main>
  );
}