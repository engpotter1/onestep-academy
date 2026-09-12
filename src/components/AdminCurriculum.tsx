"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";

type Lecture = {
  id: string;
  title: string;
  order_index: number;
  youtube_unlisted_id: string | null;
  notes?: string | null;
  pdf_urls?: string[] | null;
  image_urls?: string[] | null;
};

type Chapter = { id: string; title: string; order_index: number; lectures: Lecture[] };

type Course = {
  id: string;
  title: string;
  code: string;
  description: string | null;
  cover_url?: string | null;
  academic_year?: string | null;
  is_published: boolean;
  chapters: Chapter[];
};

export default function AdminCurriculum({ initialCourses }: { initialCourses: Course[] }) {
  const supabase = createClient();
  const [courses, setCourses] = useState(initialCourses);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courseForm, setCourseForm] = useState({
    title: "",
    code: "",
    description: "",
    academic_year: "1st Year",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  function openCreateModal() {
    setEditingCourseId(null);
    setCourseForm({ title: "", code: "", description: "", academic_year: "1st Year" });
    setCoverFile(null);
    setCoverPreview(null);
    setShowModal(true);
  }

  function openEditModal(course: Course) {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title,
      code: course.code,
      description: course.description || "",
      academic_year: course.academic_year || "1st Year",
    });
    setCoverFile(null);
    setCoverPreview(course.cover_url || null);
    setShowModal(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!courseForm.title || !courseForm.code) return;
    setUploading(true);

    let coverUrl: string | null = coverPreview;

    if (coverFile) {
      const fileExt = coverFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("course-covers")
        .upload(fileName, coverFile);

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("course-covers")
          .getPublicUrl(fileName);
        coverUrl = publicUrlData.publicUrl;
      }
    }

    if (editingCourseId) {
      const { error } = await supabase
        .from("courses")
        .update({
          title: courseForm.title,
          code: courseForm.code,
          description: courseForm.description || null,
          academic_year: courseForm.academic_year,
          cover_url: coverUrl,
        })
        .eq("id", editingCourseId);

      setUploading(false);

      if (!error) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingCourseId
              ? {
                  ...c,
                  title: courseForm.title,
                  code: courseForm.code,
                  description: courseForm.description || null,
                  academic_year: courseForm.academic_year,
                  cover_url: coverUrl,
                }
              : c
          )
        );
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: courseForm.title,
          code: courseForm.code,
          description: courseForm.description || null,
          academic_year: courseForm.academic_year,
          cover_url: coverUrl,
        })
        .select("id, title, code, description, is_published, cover_url, academic_year")
        .single();

      setUploading(false);

      if (!error && data) {
        setCourses((prev) => [{ ...data, chapters: [] }, ...prev]);
        setShowModal(false);
      }
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الكورس وجميع الفصول والمحاضرات المرتبطة به؟")) return;
    await supabase.from("courses").delete().eq("id", id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* الشريط العلوي */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-nh-card/80 to-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">إدارة المقررات والمحتوى</h2>
          <p className="text-xs text-nh-muted mt-1">
            إضافة وتعديل المناهج، رفع الأغلفة، إدارة المحاضرات، المذكرات المتعددة، والصور التوضيحية.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-95"
        >
          <span className="text-lg leading-none">+</span>
          إضافة كورس جديد
        </button>
      </div>

      {/* عرض الكورسات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="group relative rounded-2xl bg-nh-card/90 border border-white/5 hover:border-amber-500/30 transition-all duration-300 overflow-hidden flex flex-col shadow-xl"
          >
            <div className="h-44 w-full bg-gradient-to-br from-white/5 to-white/0 relative overflow-hidden flex items-center justify-center border-b border-white/5">
              {course.cover_url ? (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-nh-muted/40">
                  <span className="text-4xl">📚</span>
                  <span className="text-xs font-mono tracking-wider">{course.code}</span>
                </div>
              )}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-medium text-amber-400">
                {course.academic_year || "العام الدراسي"}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-nh-muted font-mono mb-1">
                  <span className="text-amber-400/90 font-semibold">{course.code}</span>
                  <span>{course.chapters?.length || 0} فصول</span>
                </div>
                <h3 className="font-bold text-white text-base line-clamp-1">{course.title}</h3>
                <p className="text-xs text-nh-muted line-clamp-2 mt-1.5 leading-relaxed">
                  {course.description || "لا يوجد وصف إضافي للمقرر حالياً."}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => setExpanded(expanded === course.id ? null : course.id)}
                  className="flex-1 text-xs py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium border border-white/5 hover:border-amber-500/30 transition"
                >
                  {expanded === course.id ? "إغلاق الفصول" : "إدارة الفصول والمحاضرات"}
                </button>
                <button
                  onClick={() => openEditModal(course)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-nh-muted hover:text-white border border-white/10 transition"
                  title="تعديل الكورس"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                  title="حذف الكورس"
                >
                  🗑️
                </button>
              </div>
            </div>

            {expanded === course.id && (
              <div className="border-t border-white/10 bg-black/40 p-4">
                <ChapterManager
                  course={course}
                  onChange={(chapters) =>
                    setCourses((prev) =>
                      prev.map((c) => (c.id === course.id ? { ...c, chapters } : c))
                    )
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <p className="text-nh-muted text-sm">لم يتم إنشاء أي مقررات دراسية بعد.</p>
        </div>
      )}

      {/* نافذة إضافة/تعديل كورس */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111317] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-lg text-white">
                {editingCourseId ? "تعديل بيانات المقرر" : "إضافة مقرر دراسي جديد"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-nh-muted hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-xs text-nh-muted mb-2">غلاف الكورس</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-amber-500/40 rounded-xl p-4 text-center cursor-pointer transition bg-black/20"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="معاينة" className="h-32 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div className="space-y-1 py-2">
                      <span className="text-2xl">🖼️</span>
                      <p className="text-xs text-nh-muted">اضغط لاختيار صورة الغلاف</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-nh-muted mb-1">اسم المقرر</label>
                  <input
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="مثال: تفاضل وتكامل 1"
                    className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-nh-muted mb-1">كود المقرر</label>
                  <input
                    required
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="MATH-101"
                    className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-nh-muted mb-1">الفرقة الدراسية</label>
                <select
                  value={courseForm.academic_year}
                  onChange={(e) => setCourseForm({ ...courseForm, academic_year: e.target.value })}
                  className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="1st Year">الفرقة الأولى (1st Year)</option>
                  <option value="2nd Year">الفرقة الثانية (2nd Year)</option>
                  <option value="3rd Year">الفرقة الثالثة (3rd Year)</option>
                  <option value="4th Year">الفرقة الرابعة (4th Year)</option>
                  <option value="Graduate">دراسات عليا / خريجين</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-nh-muted mb-1">وصف المقرر</label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="وصف مختصر لموضوعات المقرر..."
                  className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition disabled:opacity-50"
                >
                  {uploading ? "جاري الحفظ..." : editingCourseId ? "تحديث المقرر" : "حفظ ونشر المقرر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterManager({
  course,
  onChange,
}: {
  course: Course;
  onChange: (chapters: Chapter[]) => void;
}) {
  const supabase = createClient();
  const [chapters, setChapters] = useState(course.chapters);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");

  function update(next: Chapter[]) {
    setChapters(next);
    onChange(next);
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapterTitle) return;
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        course_id: course.id,
        title: newChapterTitle,
        order_index: chapters.length + 1,
      })
      .select("id, title, order_index")
      .single();
    if (!error && data) {
      update([...chapters, { ...data, lectures: [] }]);
      setNewChapterTitle("");
    }
  }

  function startEditChapter(chapter: Chapter) {
    setEditingChapterId(chapter.id);
    setEditChapterTitle(chapter.title);
  }

  async function saveChapterEdit(id: string) {
    if (!editChapterTitle) return;
    const { error } = await supabase.from("chapters").update({ title: editChapterTitle }).eq("id", id);
    if (!error) {
      update(chapters.map((c) => (c.id === id ? { ...c, title: editChapterTitle } : c)));
      setEditingChapterId(null);
    }
  }

  async function deleteChapter(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل بجميع محاضراته؟")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (!error) {
      update(chapters.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addChapter} className="flex gap-2">
        <input
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
          placeholder="عنوان الفصل الجديد (مثل: الفصل 1: النهايات والاتصال)"
          className="flex-1 rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
        />
        <button className="rounded-xl bg-white/10 hover:bg-white/20 text-xs px-4 py-2 text-white transition">
          إضافة فصل
        </button>
      </form>

      <div className="space-y-3">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="rounded-xl bg-black/30 border border-white/5 p-3 space-y-3">
            <div className="flex items-center justify-between">
              {editingChapterId === chapter.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={editChapterTitle}
                    onChange={(e) => setEditChapterTitle(e.target.value)}
                    className="flex-1 rounded-lg bg-black/80 border border-amber-500/50 px-2 py-1 text-xs text-white outline-none"
                  />
                  <button onClick={() => saveChapterEdit(chapter.id)} className="rounded-lg bg-green-500 text-black font-semibold text-[11px] px-2.5 py-1">
                    حفظ
                  </button>
                  <button onClick={() => setEditingChapterId(null)} className="rounded-lg bg-white/10 text-white text-[11px] px-2 py-1">
                    إلغاء
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {chapter.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-nh-muted">{chapter.lectures.length} محاضرات</span>
                    <button onClick={() => startEditChapter(chapter)} className="text-xs text-nh-muted hover:text-white p-1" title="تعديل اسم الفصل">✏️</button>
                    <button onClick={() => deleteChapter(chapter.id)} className="text-xs text-red-400/80 hover:text-red-400 p-1" title="حذف الفصل">🗑️</button>
                  </div>
                </div>
              )}
            </div>

            <LectureManager
              chapter={chapter}
              onChange={(lectures) =>
                update(chapters.map((c) => (c.id === chapter.id ? { ...c, lectures } : c)))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LectureManager({
  chapter,
  onChange,
}: {
  chapter: Chapter;
  onChange: (lectures: Lecture[]) => void;
}) {
  const supabase = createClient();
  const [lectures, setLectures] = useState(chapter.lectures);
  const [uploading, setUploading] = useState(false);

  // حالة إضافة محاضرة
  const [newTitle, setNewTitle] = useState("");
  const [newYoutubeId, setNewYoutubeId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPdfFiles, setNewPdfFiles] = useState<File[]>([]);
  const [newImgFiles, setNewImgFiles] = useState<File[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // حالة تعديل محاضرة
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editYoutubeId, setEditYoutubeId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editExistingPdfs, setEditExistingPdfs] = useState<string[]>([]);
  const [editExistingImgs, setEditExistingImgs] = useState<string[]>([]);
  const [editNewPdfs, setEditNewPdfs] = useState<File[]>([]);
  const [editNewImgs, setEditNewImgs] = useState<File[]>([]);
  const editPdfInputRef = useRef<HTMLInputElement>(null);
  const editImgInputRef = useRef<HTMLInputElement>(null);

  function update(next: Lecture[]) {
    setLectures(next);
    onChange(next);
  }

  async function uploadFiles(files: File[], bucket: string): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const cleanFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage.from(bucket).upload(cleanFileName, file);
      if (!error && data) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(cleanFileName);
        urls.push(publicData.publicUrl);
      }
    }
    return urls;
  }

  async function addLecture(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle) return;
    setUploading(true);

    const uploadedPdfs = await uploadFiles(newPdfFiles, "lecture-materials");
    const uploadedImgs = await uploadFiles(newImgFiles, "course-covers");

    const { data, error } = await supabase
      .from("lectures")
      .insert({
        chapter_id: chapter.id,
        title: newTitle,
        youtube_unlisted_id: newYoutubeId || null,
        notes: newNotes || null,
        pdf_urls: uploadedPdfs,
        image_urls: uploadedImgs,
        order_index: lectures.length + 1,
      })
      .select("id, title, order_index, youtube_unlisted_id, notes, pdf_urls, image_urls")
      .single();

    setUploading(false);

    if (!error && data) {
      update([...lectures, data]);
      setNewTitle("");
      setNewYoutubeId("");
      setNewNotes("");
      setNewPdfFiles([]);
      setNewImgFiles([]);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  function startEdit(l: Lecture) {
    setEditingId(l.id);
    setEditTitle(l.title);
    setEditYoutubeId(l.youtube_unlisted_id || "");
    setEditNotes(l.notes || "");
    setEditExistingPdfs(l.pdf_urls || []);
    setEditExistingImgs(l.image_urls || []);
    setEditNewPdfs([]);
    setEditNewImgs([]);
  }

  async function saveEdit(id: string) {
    setUploading(true);

    const newUploadedPdfs = await uploadFiles(editNewPdfs, "lecture-materials");
    const newUploadedImgs = await uploadFiles(editNewImgs, "course-covers");

    const finalPdfs = [...editExistingPdfs, ...newUploadedPdfs];
    const finalImgs = [...editExistingImgs, ...newUploadedImgs];

    const { error } = await supabase
      .from("lectures")
      .update({
        title: editTitle,
        youtube_unlisted_id: editYoutubeId || null,
        notes: editNotes || null,
        pdf_urls: finalPdfs,
        image_urls: finalImgs,
      })
      .eq("id", id);

    setUploading(false);

    if (!error) {
      update(
        lectures.map((l) =>
          l.id === id
            ? {
                ...l,
                title: editTitle,
                youtube_unlisted_id: editYoutubeId || null,
                notes: editNotes || null,
                pdf_urls: finalPdfs,
                image_urls: finalImgs,
              }
            : l
        )
      );
      setEditingId(null);
    }
  }

  async function deleteLecture(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) return;
    const { error } = await supabase.from("lectures").delete().eq("id", id);
    if (!error) {
      update(lectures.filter((l) => l.id !== id));
    }
  }

  return (
    <div className="space-y-4 pt-1">
      {/* قائمة المحاضرات */}
      <ul className="space-y-3">
        {lectures.map((l) => (
          <li
            key={l.id}
            className="bg-[#121316] border border-white/10 rounded-xl p-4 flex flex-col gap-3 shadow-md"
          >
            {editingId === l.id ? (
              /* وضع التعديل مع إظهار كل ملف بشكل منفصل */
              <div className="space-y-4 py-1">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="rounded-lg bg-black/80 border border-amber-500/50 px-3 py-2 text-xs text-white outline-none"
                    placeholder="عنوان المحاضرة"
                  />
                  <input
                    value={editYoutubeId}
                    onChange={(e) => setEditYoutubeId(e.target.value)}
                    className="rounded-lg bg-black/80 border border-amber-500/50 px-3 py-2 text-xs text-white font-mono outline-none"
                    placeholder="YouTube ID"
                  />
                </div>

                {/* 1. قسم الـ PDF المخصص */}
                <div className="bg-black/40 border border-red-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-400 font-bold flex items-center gap-1.5">
                      <span>📄</span> ملفات المذكرات (PDF)
                    </span>
                    <label className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded text-xs font-semibold transition">
                      + اختيار ملفات PDF
                      <input
                        ref={editPdfInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setEditNewPdfs((prev) => [...prev, ...files]);
                        }}
                      />
                    </label>
                  </div>

                  {/* عرض الملفات المرفوعة سابقاً على السيرفر - كل ملف لوحده */}
                  {editExistingPdfs.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-white/50 block">الملفات المرفوعة حالياً على السيرفر:</span>
                      <div className="flex flex-col gap-1.5">
                        {editExistingPdfs.map((url, i) => {
                          const name = decodeURIComponent(url.split("/").pop()?.replace(/^\d+-/, "") || `مذكرة ${i + 1}`);
                          return (
                            <div key={i} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs text-red-200">
                              <span className="truncate max-w-[280px] sm:max-w-md">📄 {name}</span>
                              <div className="flex items-center gap-2">
                                <a href={url} target="_blank" rel="noreferrer" className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-white">
                                  معاينة
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setEditExistingPdfs(editExistingPdfs.filter((_, idx) => idx !== i))}
                                  className="text-red-400 hover:text-white font-bold px-1.5 py-0.5"
                                  title="حذف هذا الملف"
                                >
                                  ✕ حذف
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* عرض الملفات الجديدة التي تم اختيارها من الجهاز الآن - كل ملف لوحده */}
                  {editNewPdfs.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-amber-400/80 block">ملفات جديدة تم اختيارها (جاهزة للرفع عند الحفظ):</span>
                      <div className="flex flex-col gap-1.5">
                        {editNewPdfs.map((file, i) => (
                          <div key={i} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-amber-200">
                            <span className="truncate max-w-[280px] sm:max-w-md font-medium">📎 {file.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/50">({(file.size / 1024).toFixed(0)} KB)</span>
                              <button
                                type="button"
                                onClick={() => setEditNewPdfs(editNewPdfs.filter((_, idx) => idx !== i))}
                                className="text-red-400 hover:text-white font-bold px-1"
                                title="إلغاء هذا الملف"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editExistingPdfs.length === 0 && editNewPdfs.length === 0 && (
                    <p className="text-[11px] text-nh-muted/50 py-1">لا توجد ملفات PDF مضافة لهذه المحاضرة.</p>
                  )}
                </div>

                {/* 2. قسم الصور المخصص */}
                <div className="bg-black/40 border border-sky-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sky-400 font-bold flex items-center gap-1.5">
                      <span>🖼️</span> الصور التوضيحية والشيتات
                    </span>
                    <label className="cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded text-xs font-semibold transition">
                      + اختيار صور
                      <input
                        ref={editImgInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setEditNewImgs((prev) => [...prev, ...files]);
                        }}
                      />
                    </label>
                  </div>

                  {/* عرض الصور الحالية والجديدة كمعاينات مصغرة مستقلة */}
                  <div className="flex flex-wrap gap-2.5">
                    {editExistingImgs.map((url, i) => (
                      <div key={`exist-${i}`} className="relative group w-16 h-16 rounded-lg border border-white/15 overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditExistingImgs(editExistingImgs.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-red-950/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-xs transition"
                          title="حذف الصورة"
                        >
                          ✕ حذف
                        </button>
                      </div>
                    ))}

                    {editNewImgs.map((file, i) => (
                      <div key={`new-${i}`} className="relative group w-16 h-16 rounded-lg border border-amber-500/40 overflow-hidden">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditNewImgs(editNewImgs.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-red-950/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-xs transition"
                          title="إلغاء الصورة"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {editExistingImgs.length === 0 && editNewImgs.length === 0 && (
                      <p className="text-[11px] text-nh-muted/50 py-1">لا توجد صور مضافة لهذه المحاضرة.</p>
                    )}
                  </div>
                </div>

                {/* 3. قسم الملاحظات */}
                <div>
                  <label className="block text-xs text-amber-400 font-semibold mb-1">💡 الملاحظات والتنبيهات:</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="ملاحظات تظهر للطالب أسفل مشغل المحاضرة..."
                    className="w-full rounded-xl bg-black/70 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* أزرار الحفظ والإلغاء البارزة */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <button
                    onClick={() => saveEdit(l.id)}
                    disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition disabled:opacity-50 shadow-lg shadow-amber-500/10"
                  >
                    {uploading ? "جاري رفع الملفات وحفظ التعديل..." : "✓ حفظ كافة التعديلات"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              /* وضع العرض العادي */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-white font-bold text-sm">{l.title}</span>
                    {l.youtube_unlisted_id && (
                      <span className="text-[11px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono border border-amber-500/20">
                        {l.youtube_unlisted_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(l)}
                      className="p-1 px-2.5 rounded-md bg-white/5 hover:bg-white/10 text-nh-muted hover:text-white text-xs border border-white/5 transition"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => deleteLecture(l.id)}
                      className="p-1 px-2.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>

                {/* عرض ملفات PDF مستقلة */}
                {l.pdf_urls && l.pdf_urls.length > 0 && (
                  <div className="bg-black/25 border border-red-500/15 rounded-xl p-3">
                    <p className="text-[11px] text-red-400 font-bold mb-2 flex items-center gap-1.5">
                      <span>📄</span> المذكرات وملفات الـ PDF ({l.pdf_urls.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {l.pdf_urls.map((url, i) => {
                        const name = decodeURIComponent(url.split("/").pop()?.replace(/^\d+-/, "") || `مذكرة ${i + 1}`);
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-200 transition"
                          >
                            <span className="truncate max-w-[200px]">📄 {name}</span>
                            <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-white font-medium">عرض</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* عرض الصور التوضيحية */}
                {l.image_urls && l.image_urls.length > 0 && (
                  <div className="bg-black/25 border border-sky-500/15 rounded-xl p-3">
                    <p className="text-[11px] text-sky-400 font-bold mb-2 flex items-center gap-1.5">
                      <span>🖼️</span> الشيتات والصور التوضيحية ({l.image_urls.length}):
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {l.image_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/10 overflow-hidden hover:border-sky-400/50 transition">
                          <img src={url} alt="" className="w-16 h-16 object-cover hover:scale-105 transition duration-200" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* عرض الملاحظات */}
                {l.notes && (
                  <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl p-3 text-xs leading-relaxed text-amber-200/90">
                    <span className="font-bold text-amber-400 block mb-1">💡 ملاحظات وتنبيهات المحاضرة:</span>
                    <p>{l.notes}</p>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {!lectures.length && (
          <li className="text-xs text-nh-muted/50 py-2 text-center border border-dashed border-white/5 rounded-lg">
            لا توجد محاضرات في هذا الفصل بعد.
          </li>
        )}
      </ul>

      {/* نموذج إضافة محاضرة جديدة من الصفر مع ظهور الملفات بشكل مستقل */}
      <form onSubmit={addLecture} className="space-y-3.5 bg-[#0d0e11] border border-white/10 p-4 rounded-xl">
        <span className="text-xs font-bold text-white block">إضافة محاضرة جديدة ومحتوياتها:</span>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="عنوان المحاضرة"
            className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <input
            value={newYoutubeId}
            onChange={(e) => setNewYoutubeId(e.target.value)}
            placeholder="YouTube ID"
            className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* صندوق اختيار ملفات الـ PDF مع إظهار أسمائها */}
        <div className="bg-black/30 border border-red-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400 font-semibold">📄 ملفات المذكرات (PDF):</span>
            <label className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded text-xs transition">
              + اختيار ملفات
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setNewPdfFiles((prev) => [...prev, ...files]);
                }}
              />
            </label>
          </div>

          {newPdfFiles.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              {newPdfFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 text-xs text-red-200">
                  <span className="truncate max-w-[260px] sm:max-w-md">📄 {file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50">({(file.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setNewPdfFiles(newPdfFiles.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* صندوق اختيار الصور مع إظهار معاينتها */}
        <div className="bg-black/30 border border-sky-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-400 font-semibold">🖼️ الصور والشيتات:</span>
            <label className="cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded text-xs transition">
              + اختيار صور
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setNewImgFiles((prev) => [...prev, ...files]);
                }}
              />
            </label>
          </div>

          {newImgFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {newImgFiles.map((file, idx) => (
                <div key={idx} className="relative group w-14 h-14 rounded-lg border border-sky-500/30 overflow-hidden">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewImgFiles(newImgFiles.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-red-950/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold text-xs transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الملاحظات */}
        <textarea
          rows={2}
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="ملاحظات وتنبيهات تظهر للطالب أسفل المحاضرة..."
          className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
        />

        <button
          type="submit"
          disabled={uploading}
          className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-6 py-2.5 transition disabled:opacity-50 shadow-md"
        >
          {uploading ? "جاري الرفع والحفظ..." : "+ إضافة المحاضرة"}
        </button>
      </form>
    </div>
  );
}