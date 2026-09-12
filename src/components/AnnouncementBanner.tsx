export default function AnnouncementBanner({
  announcements,
}: {
  announcements: { id: string; title: string; content: string }[];
}) {
  if (!announcements.length) return null;
  const a = announcements[0];
  return (
    <div className="bg-nh-blue/10 border-b border-nh-blue/20 px-6 py-2.5 text-sm flex items-center gap-2">
      <span className="text-nh-cyan font-medium">{a.title}</span>
      <span className="text-nh-muted">— {a.content}</span>
    </div>
  );
}
