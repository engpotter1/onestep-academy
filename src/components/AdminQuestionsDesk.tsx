"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import KatexRenderer from "./KatexRenderer";

type QuestionItem = {
  id: string;
  question_text: string;
  reply_text: string | null;
  reply_image_url?: string | null;
  reply_audio_url?: string | null;
  created_at: string;
  lecture: { title: string } | null;
  student: { full_name: string; personal_email: string } | null;
};

export default function AdminQuestionsDesk({
  initialQuestions,
}: {
  initialQuestions: QuestionItem[];
}) {
  const supabase = createClient();
  const [questions, setQuestions] = useState(initialQuestions);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyAudioBlob, setReplyAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  // حالات تسجيل الصوت
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // بدء التسجيل الصوتي
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setReplyAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("يرجى إعطاء صلاحية الميكروفون لتسجيل الريكورد.");
    }
  }

  // إيقاف التسجيل الصوتي
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  // حذف التسجيل الحالي
  function cancelAudio() {
    setReplyAudioBlob(null);
    setRecordingSeconds(0);
  }

  // حفظ وإرسال الرد
  async function handleSendReply(questionId: string) {
    if (!replyDraft.trim() && !replyImage && !replyAudioBlob) {
      alert("يرجى كتابة نص، أو إرفاق صورة، أو تسجيل ريكورد أولاً.");
      return;
    }
    setLoading(true);

    let finalImageUrl: string | null = null;
    let finalAudioUrl: string | null = null;

    // رفع الصورة إن وجدت
    if (replyImage) {
      const fileName = `img_${Date.now()}_${replyImage.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data } = await supabase.storage.from("qa-attachments").upload(fileName, replyImage);
      if (data) {
        const { data: pubUrl } = supabase.storage.from("qa-attachments").getPublicUrl(fileName);
        finalImageUrl = pubUrl.publicUrl;
      }
    }

    // رفع الريكورد الصوتي إن وجد
    if (replyAudioBlob) {
      const fileName = `audio_${Date.now()}.webm`;
      const { data } = await supabase.storage.from("qa-attachments").upload(fileName, replyAudioBlob);
      if (data) {
        const { data: pubUrl } = supabase.storage.from("qa-attachments").getPublicUrl(fileName);
        finalAudioUrl = pubUrl.publicUrl;
      }
    }

    const { error } = await supabase
      .from("lesson_questions")
      .update({
        reply_text: replyDraft.trim() || null,
        reply_image_url: finalImageUrl,
        reply_audio_url: finalAudioUrl,
      })
      .eq("id", questionId);

    setLoading(false);

    if (!error) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                reply_text: replyDraft.trim() || null,
                reply_image_url: finalImageUrl,
                reply_audio_url: finalAudioUrl,
              }
            : q
        )
      );
      setActiveReplyId(null);
      setReplyDraft("");
      setReplyImage(null);
      setReplyAudioBlob(null);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-4">
        {questions.length === 0 && (
          <div className="rounded-2xl bg-nh-card border border-white/5 p-12 text-center">
            <span className="text-4xl block mb-2">🎉</span>
            <p className="text-sm text-nh-muted">رائع! لا توجد أي أسئلة بحاجة إلى رد حالياً.</p>
          </div>
        )}

        {questions.map((q) => (
          <div key={q.id} className="rounded-2xl bg-nh-card border border-white/5 p-5 space-y-3.5 shadow-lg">
            {/* بيانات الطالب والمحاضرة */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold text-sm">{q.student?.full_name || "طالب"}</span>
                <span className="text-nh-muted/60 font-mono">({q.student?.personal_email})</span>
              </div>
              <span className="text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                المحاضرة: <strong className="text-amber-300">{q.lecture?.title || "غير محددة"}</strong>
              </span>
            </div>

            {/* نص السؤال من الطالب */}
            <div className="text-sm text-white leading-relaxed bg-black/30 border border-white/5 rounded-xl p-3.5">
              <KatexRenderer content={q.question_text} />
            </div>

            {/* عرض الرد في حال تم الرد سابقاً */}
            {q.reply_text || q.reply_image_url || q.reply_audio_url ? (
              <div className="bg-green-500/[0.04] border border-green-500/20 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400 font-bold flex items-center gap-1.5">
                    <span>✓</span> رد المحاضر:
                  </span>
                  <button
                    onClick={() => {
                      setActiveReplyId(q.id);
                      setReplyDraft(q.reply_text || "");
                    }}
                    className="text-xs text-white/60 hover:text-white underline"
                  >
                    تعديل الرد
                  </button>
                </div>

                {q.reply_text && (
                  <div className="text-xs text-white/90 leading-relaxed">
                    <KatexRenderer content={q.reply_text} />
                  </div>
                )}

                {q.reply_image_url && (
                  <div>
                    <a href={q.reply_image_url} target="_blank" rel="noreferrer">
                      <img
                        src={q.reply_image_url}
                        alt="توضيح الرد"
                        className="max-h-48 rounded-lg border border-white/10 hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                )}

                {q.reply_audio_url && (
                  <div className="pt-1">
                    <audio controls src={q.reply_audio_url} className="w-full h-9 rounded-md" />
                  </div>
                )}
              </div>
            ) : null}

            {/* مربع كتابة الرد التفاعلي (كتابة + صورة + صوت) */}
            {activeReplyId === q.id ? (
              <div className="bg-black/60 border border-amber-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-amber-400 block">إضافة الرد (اكتب، صوّر، أو سجّل):</span>

                {/* 1. الرد الكتابي */}
                <textarea
                  rows={3}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="اكتب توضيحك أو خطوات الحل هنا (يدعم LaTeX)..."
                  className="w-full rounded-xl bg-black/80 border border-white/10 p-3 text-xs text-white outline-none focus:border-amber-500 resize-none"
                />

                {/* 2. الرد بالصور والتسجيل الصوتي */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* زر رفع صورة توضيحية */}
                  <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition">
                    <span>📷</span>
                    <span>{replyImage ? replyImage.name : "إرفاق صورة حل ورقي"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setReplyImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  {replyImage && (
                    <button onClick={() => setReplyImage(null)} className="text-red-400 text-xs">✕ إلغاء الصورة</button>
                  )}

                  {/* مسجل الصوت المباشر */}
                  {!isRecording && !replyAudioBlob && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <span>🎙️</span>
                      <span>تسجيل ريكورد صوتي</span>
                    </button>
                  )}

                  {isRecording && (
                    <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs text-red-300 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>جاري التسجيل ({recordingSeconds} ثانية)...</span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[11px] mr-1"
                      >
                        إيقاف
                      </button>
                    </div>
                  )}

                  {replyAudioBlob && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs text-amber-300">
                      <span>🎧 تم تسجيل الريكورد بنجاح</span>
                      <button type="button" onClick={cancelAudio} className="text-red-400 font-bold">✕ حذف</button>
                    </div>
                  )}
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleSendReply(q.id)}
                    disabled={loading || isRecording}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? "جاري رفع الرد..." : "إرسال الرد للطالب"}
                  </button>
                  <button
                    onClick={() => {
                      setActiveReplyId(null);
                      setReplyDraft("");
                      setReplyImage(null);
                      setReplyAudioBlob(null);
                    }}
                    className="bg-white/10 text-white text-xs px-4 py-2 rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : !q.reply_text && !q.reply_image_url && !q.reply_audio_url ? (
              <button
                onClick={() => {
                  setActiveReplyId(q.id);
                  setReplyDraft("");
                  setReplyImage(null);
                  setReplyAudioBlob(null);
                }}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 w-fit"
              >
                <span>💬</span>
                <span>الرد على استفسار الطالب</span>
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}