import type { ReactNode } from "react";

/**
 * Full-width page frame. Forms that should stay narrow (login) center themselves.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</div>
  );
}
