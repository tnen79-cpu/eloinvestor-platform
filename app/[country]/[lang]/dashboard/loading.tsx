export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-2xl bg-slate-100" />
        <div className="h-64 rounded-[2.5rem] bg-slate-100" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-80 rounded-[2rem] bg-white shadow-sm" />)}
        </div>
      </div>
    </main>
  );
}
