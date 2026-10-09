import { PageShell } from "@/components/PageShell";
import { RailSkeleton } from "@/components/Skeletons";

export default function HomeLoading() {
  return (
    <PageShell>
      <div className="space-y-10">
        <div className="space-y-3">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-9 w-48 rounded-full" />
        </div>
        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton count={2} />
      </div>
    </PageShell>
  );
}
