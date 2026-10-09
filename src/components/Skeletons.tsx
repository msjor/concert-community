/** Lightweight shimmer placeholders for discovery rails. */

export function EventTileSkeleton() {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
      <div className="skeleton h-40 w-full" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function RailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-3 w-56" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }, (_, i) => (
          <EventTileSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-zinc-800 py-4" aria-hidden>
      <div className="skeleton h-20 w-20 shrink-0 rounded-md" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}
