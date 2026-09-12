"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Announcement = { id: string; title: string; content: string; is_active: boolean };

export default function AdminAnnouncements({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState(initialAnnouncements);
  const [form, setForm] = useState({ title: "", content: "" });

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.content) return;
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: form.title, content: form.content })
      .select("id, title, content, is_active")
      .single();
    if (!error && data) {
      setItems([data, ...items]);
      setForm({ title: "", content: "" });
    }
  }

  async function toggleActive(id: string, next: boolean) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: next } : a)));
    await supabase.from("announcements").update({ is_active: next }).eq("id", id);
  }

  return (
    <div className="rounded-2xl bg-nh-card border border-white/5 p-5">
      <h3 className="font-display font-medium mb-4">Announcements</h3>
      <form onSubmit={post} className="grid sm:grid-cols-[200px_1fr_auto] gap-2 mb-5">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title, e.g. Midterm alert"
          className="rounded-lg bg-nh-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nh-cyan/50"
        />
        <input
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Message shown to all active students"
          className="rounded-lg bg-nh-black border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nh-cyan/50"
        />
        <button className="rounded-lg bg-nh-cyan text-nh-black text-sm font-medium px-4 py-2 hover:brightness-110 transition">
          Post
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between text-sm border-t border-white/5 pt-2"
          >
            <div>
              <span className="font-medium">{a.title}</span>
              <span className="text-nh-muted"> — {a.content}</span>
            </div>
            <button
              onClick={() => toggleActive(a.id, !a.is_active)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                a.is_active
                  ? "border-nh-cyan/40 text-nh-cyan"
                  : "border-white/10 text-nh-muted"
              }`}
            >
              {a.is_active ? "Active" : "Hidden"}
            </button>
          </li>
        ))}
        {!items.length && <p className="text-sm text-nh-muted">No announcements yet.</p>}
      </ul>
    </div>
  );
}
