import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import Link from "next/link";
import { revalidatePath } from "next/cache";

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

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  // الإحصائيات مع عدد الأسئلة التي لم يُرد عليها بعد
  const [
    { count: pendingCount },
    { count: totalStudents },
    { count: coursesCount },
    { count: pendingQuestionsCount }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lesson_questions").select("*", { count: "exact", head: true }).is("reply_text", null).is("reply_audio_url", null)
  ]);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  async function postAnnouncement(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    if (!title || !body) return;

    const serverSupabase = createClient();
    await serverSupabase.from("announcements").insert({ title, body });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }

  return (
    <main className="min-h-screen bg-nh-black text-white" dir="rtl">
      <TopNav role="admin" fullName={profile.full_name} />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">مركز التحكم</h1>
          <p className="text-xs text-nh-muted mt-1">متابعة نشاط المنصة، الطلاب، واستفسارات المنهج.</p>
        </div>

        {/* كروت الإحصائيات الأربعة */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

          <div className="rounded-2xl bg-nh-card border border-amber-500/20 bg-amber-500/[0.03] p-5">
            <span className="text-xs text-amber-400 block mb-1 font-semibold">أسئلة بحاجة لرد</span>
            <span className="text-3xl font-bold text-amber-400 font-mono">{pendingQuestionsCount || 0}</span>
          </div>
        </div>

        {/* بطاقات التنقل السريع - أصبحت 3 بطاقات متناسقة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/questions"
            className="rounded-2xl bg-nh-card border border-white/5 hover:border-amber-500/40 p-5 transition group block"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📬</span>
              {pendingQuestionsCount ? (
                <span className="text-[10px] bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full">
                  {pendingQuestionsCount} جديد
                </span>
              ) : null}
            </div>
            <h3 className="font-bold text-base mb-1 group-hover:text-amber-400 transition">بنك استفسارات الطلاب</h3>
            <p className="text-xs text-nh-muted">الرد على أسئلة الدروس بالصوت، الصور، أو كتابة الحلول.</p>
          </Link>

          <Link
            href="/admin/students"
            className="rounded-2xl bg-nh-card border border-white/5 hover:border-amber-500/40 p-5 transition group block"
          >
            <span className="text-2xl block mb-2">👥</span>
            <h3 className="font-bold text-base mb-1 group-hover:text-amber-400 transition">إدارة الطلاب</h3>
            <p className="text-xs text-nh-muted">الموافقة على الحسابات الجديدة وتفعيل دفعات الطلاب.</p>
          </Link>

          <Link
            href="/admin/courses"
            className="rounded-2xl bg-nh-card border border-white/5 hover:border-amber-500/40 p-5 transition group block"
          >
            <span className="text-2xl block mb-2">📚</span>
            <h3 className="font-bold text-base mb-1 group-hover:text-amber-400 transition">إدارة المناهج والمحاضرات</h3>
            <p className="text-xs text-nh-muted">إنشاء وتعديل المقررات، رفع المذكرات، وضبط الفيديوهات.</p>
          </Link>
        </div>

        {/* قسم الإعلانات */}
        <div className="rounded-2xl bg-nh-card border border-white/5 p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <span>📢</span> نشر إعلان عام للطلاب
          </h3>

          <form action={postAnnouncement} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3">
            <input
              name="title"
              required
              placeholder="عنوان الإعلان (مثال: موعد امتحان الميدتيرم)"
              className="rounded-xl bg-black/50 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <input
              name="body"
              required
              placeholder="نص التنبيه أو التفاصيل الموجهة للطلاب..."
              className="rounded-xl bg-black/50 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 transition shrink-0"
            >
              نشر الإعلان
            </button>
          </form>

          {announcements && announcements.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-nh-muted block">آخر التنبيهات المنشورة:</span>
              <div className="space-y-1.5">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-amber-400 font-bold ml-2">{a.title}:</span>
                      <span className="text-white/80">{a.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}