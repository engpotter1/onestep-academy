"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function extractYouTubeId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  return null;
}

export default function VideoPlayer({
  youtubeUnlistedId,
  lectureId,
}: {
  youtubeUnlistedId: string | null;
  lectureId?: string;
}) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [resumedTime, setResumedTime] = useState<number | null>(null);

  const cleanId = extractYouTubeId(youtubeUnlistedId);
  const storageKey = cleanId ? `lecture_progress_${cleanId}` : null;

  useEffect(() => {
    if (!cleanId) return;

    let savedTime = 0;
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        savedTime = parseFloat(stored);
      }
    }

    function createPlayer() {
      if (!containerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: cleanId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(savedTime),
        },
        events: {
          onReady: (event: any) => {
            if (savedTime > 5) {
              setResumedTime(Math.floor(savedTime));
              event.target.seekTo(savedTime, true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const currentTime = playerRef.current.getCurrentTime();
                  const duration = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;

                  // 1. حفظ في المتصفح محلياً للاستئناف السريع
                  if (storageKey) {
                    localStorage.setItem(storageKey, currentTime.toString());
                  }

                  // 2. مزامنة النسبة المئوية مع قاعدة البيانات للوحة الأدمن
                  if (duration > 0 && lectureId) {
                    const percent = Math.min(100, Math.round((currentTime / duration) * 100));
                    supabase.auth.getUser().then(({ data: { user } }) => {
                      if (user) {
                        supabase.from("lecture_progress").upsert(
                          {
                            user_id: user.id,
                            lecture_id: lectureId,
                            progress_percent: percent,
                            last_position_seconds: Math.floor(currentTime),
                            is_completed: percent >= 85,
                            updated_at: new Date().toISOString(),
                          },
                          { onConflict: "user_id,lecture_id" }
                        ).then();
                      }
                    });
                  }
                }
              }, 3000);
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const existingScript = document.getElementById("youtube-iframe-api");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => createPlayer();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [cleanId, storageKey, lectureId]);

  if (!cleanId) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-3xl mb-2">🎬</span>
        <p className="text-white font-medium text-sm">لا يتوفر فيديو صالح لهذه المحاضرة</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />
      {resumedTime && (
        <div className="absolute top-3 left-3 z-20 bg-amber-500/90 text-black text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md animate-fade-out">
          تم استئناف التشغيل عند الدقيقة {Math.floor(resumedTime / 60)}:{("0" + (resumedTime % 60)).slice(-2)}
        </div>
      )}
    </div>
  );
}