"use client";

import { useEffect, useState } from "react";

export default function Notepad({ lectureId }: { lectureId: string }) {
  const storageKey = `nh-notes-${lectureId}`;
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setText(saved);
  }, [storageKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (text) {
        localStorage.setItem(storageKey, text);
        setSavedAt(new Date().toLocaleTimeString());
      }
    }, 600);
    return () => clearTimeout(t);
  }, [text, storageKey]);

  return (
    <div className="rounded-xl bg-nh-card border border-white/5 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-sm font-medium">My notes</h3>
        {savedAt && <span className="text-[11px] text-nh-muted">Saved {savedAt}</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jot down anything while you watch — saved automatically on this device."
        className="flex-1 min-h-[220px] w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-nh-muted/50"
      />
    </div>
  );
}
