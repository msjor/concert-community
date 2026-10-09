import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  href?: string;
  children: ReactNode;
  empty?: ReactNode;
};

export function Rail({ title, subtitle, href, children, empty }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
          {subtitle ? <p className="text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-sm text-crimson underline-offset-2 hover:underline"
          >
            See all
          </Link>
        ) : null}
      </div>
      {empty ? (
        empty
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin] lg:flex-wrap lg:overflow-visible">
          {children}
        </div>
      )}
    </section>
  );
}
