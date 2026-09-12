import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import AdminQuestionsDesk from "@/components/AdminQuestionsDesk";
import BackButton from "@/components/BackButton";

export default async function AdminQuestionsPage() {
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

  const { data: questions } = await supabase
    .from("lesson_questions")
    .select(
      `
      id,
      question_text,
      reply_text,
      reply_image_url,
      reply_audio_url,
      created_at,
      lecture:lectures(title),
      student:profiles(full_name, personal_email)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-nh-black text-white" dir="rtl">
      <TopNav role="admin" fullName={profile.full_name} />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* شريط العنوان مع زر الرجوع */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold">بنك استفسارات الطلاب</h1>
            <p className="text-xs text-nh-muted mt-1">الرد على أسئلة المحاضرات كتابياً، بالصور، أو بالصوت.</p>
          </div>
          <BackButton fallback="/admin" label="العودة للوحة الإدارة" />
        </div>

        <AdminQuestionsDesk initialQuestions={(questions as any) || []} />
      </div>
    </main>
  );
}