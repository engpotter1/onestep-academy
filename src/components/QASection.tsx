"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import KatexRenderer from "./KatexRenderer";

type Question = {
  id: string;
  question_text: string;
  reply_text: string | null;
  created_at: string;
};

export default function QASection({
  lectureId,
  initialQuestions,
}: {
  lectureId: string;
  initialQuestions: Question[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("lesson_questions").insert({
        lecture_id: lectureId,
        student_id: user.id,
        question_text: draft.trim(),
      });
    }

    setDraft("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-[#111317] border border-white/10 p-5 shadow-xl space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <span>💬</span> أسئلة واستفسارات الطلاب حول المحاضرة
        </h3>
        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
          {initialQuestions.length} استفسار
        </span>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {!initialQuestions.length && (
          <p className="text-xs text-nh-muted/60 py-4 text-center">
            لا توجد أسئلة حتى الآن. لديك سؤال؟ اكتب استفسارك وسيقوم المحاضر بالرد عليك مباشرة.
          </p>
        )}
        {initialQuestions.map((q) => (
          <div key={q.id} className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2">
            <div className="text-xs text-white leading-relaxed">
              <KatexRenderer content={q.question_text} />
            </div>

            {q.reply_text ? (
              <div className="mr-2 pr-3 border-r-2 border-amber-400 bg-amber-500/[0.03] p-2 rounded-lg">
                <span className="text-[10px] text-amber-400 font-bold block mb-1">رد المحاضر:</span>
                <div className="text-xs text-white/90">
                  <KatexRenderer content={q.reply_text} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-nh-muted/60 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                قيد انتظار رد المحاضر...
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="اكتب سؤالك هنا (يدعم المعادلات الرياضية عبر LaTeX مثل: $\int x^2 dx$)..."
          className="flex-1 rounded-xl bg-black/60 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
        />
        <button
          disabled={submitting}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-5 py-2 transition disabled:opacity-50 shadow-md shrink-0"
        >
          {submitting ? "جاري الإرسال..." : "إرسال السؤال"}
        </button>
      </form>
    </div>
  );
}