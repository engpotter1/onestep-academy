import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import PendingScreen from "@/components/PendingScreen";
import TopNav from "@/components/TopNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  if (!profile.is_approved || profile.is_locked) {
    return <PendingScreen fullName={profile.full_name} />;
  }

  // RLS ensures only published courses reach an approved, unlocked student.
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, code, description, cover_image_path")
    .order("created_at", { ascending: false });

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  return (
    <main className="min-h-screen bg-nh-black">
      <TopNav role="student" fullName={profile.full_name} />
      <AnnouncementBanner announcements={announcements ?? []} />

      <section className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Your courses</h1>
        <p className="text-nh-muted text-sm mb-8">
          {courses?.length ?? 0} course{courses?.length === 1 ? "" : "s"} unlocked
        </p>

        {!courses?.length && (
          <div className="rounded-2xl border border-white/5 bg-nh-card p-10 text-center text-nh-muted">
            No courses have been assigned to your account yet.
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses?.map((c) => (
            <Link
              key={c.id}
              href={`/course/${c.id}`}
              className="rounded-2xl bg-nh-card border border-white/5 p-5 hover:border-nh-cyan/40 transition group"
            >
              <span className="text-xs text-nh-cyan font-medium">{c.code}</span>
              <h3 className="font-display font-medium mt-1 mb-2 group-hover:text-nh-cyan transition">
                {c.title}
              </h3>
              <p className="text-sm text-nh-muted line-clamp-2">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
