export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
    </div>
  );
}
