"use client";

import Image from "next/image";
import { useState } from "react";
import { resolveBandImage } from "@/lib/bandImages";
import { venueAccentClass } from "@/lib/venueStyle";

type Props = {
  bandName: string;
  imageUrl?: string | null;
  venue?: string;
  alt?: string;
  className?: string;
  /** letter fallback size hint */
  letterClassName?: string;
  sizes?: string;
  priority?: boolean;
};

export function BandImage({
  bandName,
  imageUrl,
  venue,
  alt,
  className = "",
  letterClassName = "text-3xl font-black uppercase text-white/90",
  sizes = "(max-width: 768px) 50vw, 224px",
  priority = false,
}: Props) {
  const src = resolveBandImage(bandName, imageUrl);
  const [failed, setFailed] = useState(false);
  const accent = venueAccentClass(venue ?? "");

  if (failed) {
    return (
      <div className={`relative overflow-hidden ${accent} ${className}`}>
        <span className={`absolute bottom-2 left-2 ${letterClassName}`}>
          {bandName.slice(0, 1)}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
      <Image
        src={src}
        alt={alt ?? bandName}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setFailed(true)}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"
        aria-hidden
      />
    </div>
  );
}
