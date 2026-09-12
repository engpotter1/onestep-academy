import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import AdminStudentTable from "@/components/AdminStudentTable";
import BackButton from "@/components/BackButton";

export default async function AdminStudentsPage() {
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

  const { data: students } = await supabase
    .from("profiles")
    .select(
      "id, full_name, university_email, personal_email, phone_number, academic_year, is_approved, is_locked, created_at"
    )
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const years = Array.from(new Set((students ?? []).map((s) => s.academic_year))).sort();

  return (
    <main className="min-h-screen bg-nh-black text-white" dir="rtl">
      <TopNav role="admin" fullName={profile.full_name} />

      <section className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة الطلاب والمتابعة</h1>
            <p className="text-xs text-nh-muted mt-1">
              متابعة حسابات الطلاب، التحكم في التفعيل، ونسب مشاهدة المحاضرات.
            </p>
          </div>
          <BackButton fallback="/admin" label="لوحة التحكم" />
        </div>

        <AdminStudentTable initialStudents={students ?? []} academicYears={years} />
      </section>
    </main>
  );
}