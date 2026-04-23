"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface PlayerOption {
  id: string;
  rating: number;
  user: { name: string | null; image: string | null };
}

export interface PlayerSearchInputProps {
  label: string;
  players: PlayerOption[];
  excludeIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function PlayerSearchInput({
  label,
  players,
  excludeIds,
  selectedId,
  onSelect,
  onClear,
  placeholder = "Search by name...",
}: PlayerSearchInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = selectedId ? players.find((p) => p.id === selectedId) : null;

  const filtered = players.filter((p) => {
    if (p.id === selectedId) return false;
    if (excludeIds.includes(p.id)) return false;
    if (!query) return true;
    return p.user.name?.toLowerCase().includes(query.toLowerCase());
  });

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border-2 border-primary bg-primary/12 ring-1 ring-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            {selected.user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{selected.user.name}</p>
            <p className="text-xs text-neutral">Rating: {selected.rating}</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-primary/15 transition-colors"
          aria-label="Clear player"
        >
          <X size={16} className="text-neutral" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-neutral mb-1.5">{label}</label>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
        />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-3 h-11 rounded-xl border-2 border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-neutral text-center py-4">
              No players found
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-background transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-background text-neutral flex items-center justify-center text-xs font-bold">
                    {p.user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{p.user.name}</span>
                </div>
                <span className="text-xs text-neutral">
                  Rating: {p.rating}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
