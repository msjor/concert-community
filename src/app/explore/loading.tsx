import { PageShell } from "@/components/PageShell";

export default function ExploreLoading() {
  return (
    <PageShell>
      <div className="space-y-4">
        <div className="skeleton h-8 w-36" />
        <div className="skeleton h-9 w-48 rounded-full" />
        <div className="space-y-4 pt-2">
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex gap-3 border-b border-zinc-800 pb-4">
              <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-4 w-56" />
                <div className="skeleton h-16 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
