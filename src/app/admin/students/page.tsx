import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import AdminCurriculum from "@/components/AdminCurriculum";

export default async function AdminCoursesPage() {
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

  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      is_published,
      lectures (
        id,
        title,
        order_index,
        video_url,
        notes_url,
        is_free
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-nh-black text-white" dir="rtl">
      <TopNav role="admin" fullName={profile?.full_name ?? "Admin"} />

      <section className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-8">
          Curriculum management
        </h1>
        <AdminCurriculum initialCourses={(courses as any) ?? []} />
      </section>
    </main>
  );
}