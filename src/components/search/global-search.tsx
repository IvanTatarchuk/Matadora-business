"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, FolderKanban, FileText, Users, Package, File, Clock } from "lucide-react";
import { globalSearch, saveSearch, getRecentSearches, type SearchResult } from "@/lib/actions/search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TYPE_ICONS: Record<string, React.ElementType> = {
  project: FolderKanban,
  offer: FileText,
  worker: Users,
  material: Package,
  inventory: Package,
  document: File,
};

const TYPE_LABELS: Record<string, string> = {
  project: "Projekt",
  offer: "Oferta",
  worker: "Pracownik",
  material: "Materiał",
  inventory: "Magazyn",
  document: "Dokument",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadRecent();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadRecent() {
    const { data: { user } } = await fetch("/api/auth/user").then(r => r.json());
    if (user) {
      const recents = await getRecentSearches(user.id);
      setRecent(recents);
    }
  }

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }

  async function handleSelect(result: SearchResult) {
    await saveSearch(query);
    setIsOpen(false);
    window.location.href = result.url;
  }

  async function handleRecentClick(q: string) {
    setQuery(q);
    await handleSearch(q);
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-7 w-7 p-0"
            onClick={() => { setQuery(""); setResults([]); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {loading && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Szukanie...
              </div>
            )}

            {!loading && query.length < 2 && recent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Ostatnie wyszukiwania
                </div>
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRecentClick(r)}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Wyniki ({results.length})
                </div>
                {results.map((result) => {
                  const Icon = TYPE_ICONS[result.type] || File;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full text-left px-2 py-2 rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Brak wyników dla &quot;{query}&quot;
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
