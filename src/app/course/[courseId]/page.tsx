import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";

export default async function CoursePage({
  params,
}: {
  params: { courseId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_approved, is_locked")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (!profile.is_approved || profile.is_locked) redirect("/dashboard");

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, code, description")
    .eq("id", params.courseId)
    .single();

  if (!course) redirect("/dashboard");

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, order_index, lectures(id, title, order_index)")
    .eq("course_id", params.courseId)
    .order("order_index", { ascending: true });

  return (
    <main className="min-h-screen bg-nh-black">
      <TopNav role="student" fullName={profile.full_name} />
      <section className="max-w-3xl mx-auto px-6 py-10">
        <span className="text-xs text-nh-cyan font-medium">{course.code}</span>
        <h1 className="font-display text-2xl font-semibold mt-1 mb-2">{course.title}</h1>
        <p className="text-nh-muted text-sm mb-8">{course.description}</p>

        <div className="space-y-6">
          {chapters?.map((chapter: any) => (
            <div key={chapter.id}>
              <h2 className="font-display font-medium mb-2 text-nh-muted">{chapter.title}</h2>
              <div className="space-y-2">
                {chapter.lectures
                  ?.sort((a: any, b: any) => a.order_index - b.order_index)
                  .map((lecture: any) => (
                    <Link
                      key={lecture.id}
                      href={`/course/${course.id}/lecture/${lecture.id}`}
                      className="flex items-center gap-3 rounded-xl bg-nh-card border border-white/5 px-4 py-3 hover:border-nh-cyan/40 transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <circle cx="12" cy="12" r="10" stroke="#00E5FF" strokeWidth="1.5" />
                        <path d="M10 8l6 4-6 4V8z" fill="#00E5FF" />
                      </svg>
                      <span className="text-sm">{lecture.title}</span>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
