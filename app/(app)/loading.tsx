export default function Loading() {
  return (
    <div className="space-y-6 py-2 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-80 rounded bg-white/[0.04]" />
      </div>
      <div className="h-44 rounded-2xl border border-white/[0.07] bg-white/[0.015]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-white/[0.07] bg-white/[0.015]" />
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-64 rounded-xl border border-white/[0.07] bg-white/[0.015]" />
        <div className="lg:col-span-2 h-64 rounded-xl border border-white/[0.07] bg-white/[0.015]" />
      </div>
    </div>
  );
}
