export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600/20 border-t-emerald-600" />
    </div>
  );
}
