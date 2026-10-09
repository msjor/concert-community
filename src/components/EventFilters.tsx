"use client";

type Props = {
  cities: string[];
  genres: string[];
  city: string;
  genre: string;
  aloneOnly: boolean;
  onCityChange: (city: string) => void;
  onGenreChange: (genre: string) => void;
  onAloneOnlyChange: (value: boolean) => void;
  hideCity?: boolean;
};

export function EventFilters({
  cities,
  genres,
  city,
  genre,
  aloneOnly,
  onCityChange,
  onGenreChange,
  onAloneOnlyChange,
  hideCity = false,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {!hideCity && cities.length > 0 ? (
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-400">
            City
            <select
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-400">
          Genre
          <select
            value={genre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="min-h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={aloneOnly}
          onChange={(e) => onAloneOnlyChange(e.target.checked)}
          className="h-4 w-4 accent-crimson"
        />
        Shows where someone is open to meet
      </label>
    </div>
  );
}
