import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import TopNav from "@/components/TopNav";
import VideoPlayer from "@/components/VideoPlayer";
import KatexRenderer from "@/components/KatexRenderer";
import Notepad from "@/components/Notepad";
import QASection from "@/components/QASection";

export default async function LecturePage({
  params,
}: {
  params: { courseId: string; lectureId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone_number, is_approved, is_locked")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (!profile.is_approved || profile.is_locked) redirect("/dashboard");

  const { data: lecture } = await supabase
    .from("lectures")
    .select("id, title, description_latex, youtube_unlisted_id, pdf_storage_path, formula_sheet_latex")
    .eq("id", params.lectureId)
    .single();

  if (!lecture) redirect(`/course/${params.courseId}`);

  // Expiring signed URL — regenerated on every page load, valid for 60s of
  // link-sharing exposure before it needs a fresh request from this page.
  let pdfUrl: string | null = null;
  if (lecture.pdf_storage_path) {
    const { data: signed } = await supabase.storage
      .from("lecture-pdfs")
      .createSignedUrl(lecture.pdf_storage_path, 60);
    pdfUrl = signed?.signedUrl ?? null;
  }

  const { data: questions } = await supabase
    .from("lesson_questions")
    .select("id, question_text, reply_text, created_at")
    .eq("lecture_id", lecture.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-nh-black">
      <TopNav role="student" fullName={profile.full_name} />

      <section className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href={`/course/${params.courseId}`}
          className="text-xs text-nh-muted hover:text-nh-cyan transition"
        >
          ← Back to course
        </Link>
        <h1 className="font-display text-xl font-semibold mt-2 mb-6">{lecture.title}</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {lecture.youtube_unlisted_id && (
              <VideoPlayer
                youtubeUnlistedId={lecture.youtube_unlisted_id}
                fullName={profile.full_name}
                phoneNumber={profile.phone_number}
              />
            )}

            {lecture.description_latex && (
              <div className="rounded-xl bg-nh-card border border-white/5 p-4">
                <KatexRenderer content={lecture.description_latex} />
              </div>
            )}

            {pdfUrl && (
              <div className="rounded-xl bg-nh-card border border-white/5 p-4">
                <h3 className="font-display text-sm font-medium mb-3">Lecture notes (PDF)</h3>
                <div className="protected-media" onContextMenu={(e) => e.preventDefault()}>
                  <iframe src={pdfUrl} className="w-full h-[70vh] rounded-lg" title="Lecture PDF" />
                </div>
              </div>
            )}

            <QASection lectureId={lecture.id} initialQuestions={questions ?? []} />
          </div>

          <aside className="space-y-6">
            <Notepad lectureId={lecture.id} />

            {lecture.formula_sheet_latex && (
              <details className="rounded-xl bg-nh-card border border-white/5 p-4">
                <summary className="font-display text-sm font-medium cursor-pointer">
                  Formula cheat-sheet
                </summary>
                <div className="mt-3">
                  <KatexRenderer content={lecture.formula_sheet_latex} />
                </div>
              </details>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
