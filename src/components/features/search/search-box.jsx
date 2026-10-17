'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Folder, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global search box for the top bar. Debounces input, fetches results from
 * /api/search, and navigates on click or Enter.
 */
export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ projects: [], issues: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const allResults = [...results.projects, ...results.issues];

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults({ projects: [], issues: [] });
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
          setActiveIndex(-1);
        }
      } catch {
        // Silently fail — search is best-effort
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateTo = useCallback(
    (target) => {
      setIsOpen(false);
      setQuery('');
      router.push(target);
    },
    [router]
  );

  const handleKeyDown = (e) => {
    if (!isOpen || allResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      navigateTo(allResults[activeIndex].target);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search projects and issues…"
          aria-label="Search"
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent pr-2.5 pl-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
        />
      </div>

      {isOpen && query.trim() && (
        <div className="bg-card absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl shadow-enterprise ring-1 ring-foreground/10">
          {isLoading && allResults.length === 0 ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">Searching…</div>
          ) : allResults.length === 0 ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">No results found.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {results.projects.length > 0 && (
                <div>
                  <div className="text-muted-foreground px-3 pt-1.5 pb-0.5 text-[0.65rem] font-medium uppercase tracking-wide">
                    Projects
                  </div>
                  {results.projects.map((item, idx) => (
                    <ResultItem
                      key={item.id}
                      item={item}
                      isActive={idx === activeIndex}
                      onNavigate={navigateTo}
                      onHover={() => setActiveIndex(idx)}
                    />
                  ))}
                </div>
              )}
              {results.issues.length > 0 && (
                <div>
                  <div className="text-muted-foreground px-3 pt-1.5 pb-0.5 text-[0.65rem] font-medium uppercase tracking-wide">
                    Issues
                  </div>
                  {results.issues.map((item, idx) => {
                    const globalIdx = results.projects.length + idx;
                    return (
                      <ResultItem
                        key={item.id}
                        item={item}
                        isActive={globalIdx === activeIndex}
                        onNavigate={navigateTo}
                        onHover={() => setActiveIndex(globalIdx)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultItem({ item, isActive, onNavigate, onHover }) {
  const Icon = item.type === 'project' ? Folder : AlertCircle;
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
        isActive && 'bg-accent'
      )}
      onClick={() => onNavigate(item.target)}
      onMouseEnter={onHover}
    >
      <Icon className="text-muted-foreground size-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        <div className="text-muted-foreground truncate text-xs">{item.subtitle}</div>
      </div>
    </button>
  );
}
