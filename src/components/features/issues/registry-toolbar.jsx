'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { BackButton } from '@/components/features/projects/back-button';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { InlineStat } from '@/components/ui/stat';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'usability', label: 'Usability' },
  { value: 'safety', label: 'Safety' },
  { value: 'both', label: 'Both' },
];

/** A labelled group of inline stats, shown as a soft segment. */
function StatGroup({ title, children }) {
  return (
    <div className="bg-muted/60 ring-foreground/[0.05] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-1.5 ring-1">
      <span className="eyebrow mr-1 text-[0.6rem]">{title}</span>
      {children}
    </div>
  );
}

/**
 * Registry toolbar: back button, project-wide stats (issues, recommendations,
 * requirements, evidence) and the issue list filters with a clear-all action.
 * Stats always cover every issue in the project; filters only affect the list.
 *
 * @param {{ projectId: string, issues: object[], projectPackages: object[], filters: { status: string, type: string, packageId: string }, onFiltersChange: (filters: object) => void }} props
 */
export function RegistryToolbar({ projectId, issues, projectPackages, filters, onFiltersChange }) {
  const stats = useMemo(() => {
    let open = 0;
    let closed = 0;
    let totalRecommendations = 0;
    let recommendationsOpen = 0;
    let recommendationsClosed = 0;
    let totalRequirements = 0;
    let requirementsOpen = 0;
    let requirementsClosed = 0;
    let evidence = 0;

    for (const issue of issues) {
      if (issue.status === 'open') open += 1;
      else if (issue.status === 'closed') closed += 1;

      for (const rec of issue.recommendations ?? []) {
        totalRecommendations += 1;
        const reqs = rec.requirements ?? [];
        const openRequirements = reqs.filter((req) => req.status !== 'closed').length;
        // Open when any requirement is open; closed only once every
        // requirement is closed. Recommendations without requirements
        // count towards neither.
        if (openRequirements > 0) recommendationsOpen += 1;
        else if (reqs.length > 0) recommendationsClosed += 1;

        for (const req of reqs) {
          totalRequirements += 1;
          if (req.status === 'closed') requirementsClosed += 1;
          else requirementsOpen += 1;
          evidence += (req.evidence ?? []).length;
        }
      }
    }

    return {
      total: issues.length,
      open,
      closed,
      totalRecommendations,
      recommendationsOpen,
      recommendationsClosed,
      totalRequirements,
      requirementsOpen,
      requirementsClosed,
      evidence,
    };
  }, [issues]);

  const hasActiveFilters =
    filters.status !== 'all' || filters.type !== 'all' || filters.packageId !== 'all';

  function update(patch) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className="surface-glass border-border/70 z-10 shrink-0 border-b px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BackButton fallbackHref={`/projects/${projectId}`} />

        {/* Stats: issues | recommendations | requirements | evidence */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2">
          <StatGroup title="Issues">
            <InlineStat label="Total" value={stats.total} />
            <InlineStat label="Open" value={stats.open} />
            <InlineStat label="Closed" value={stats.closed} />
          </StatGroup>

          <StatGroup title="Recs">
            <InlineStat label="Total" value={stats.totalRecommendations} />
            <InlineStat label="Open" value={stats.recommendationsOpen} />
            <InlineStat label="Closed" value={stats.recommendationsClosed} />
          </StatGroup>

          <StatGroup title="Requirements">
            <InlineStat label="Total" value={stats.totalRequirements} />
            <InlineStat label="Open" value={stats.requirementsOpen} />
            <InlineStat label="Closed" value={stats.requirementsClosed} />
          </StatGroup>

          <StatGroup title="Evidence">
            <InlineStat label="Files" value={stats.evidence} />
          </StatGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            title="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Status: {option.label}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            value={filters.type}
            onChange={(e) => update({ type: e.target.value })}
            aria-label="Filter by type"
            title="Filter by type"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Type: {option.label}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            value={filters.packageId}
            onChange={(e) => update({ packageId: e.target.value })}
            aria-label="Filter by package"
            title="Filter by package"
          >
            <option value="all">Package: All</option>
            {projectPackages.map((pkg) => (
              <option key={pkg._id} value={pkg._id}>
                Package: {pkg.packageId}
              </option>
            ))}
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({ status: 'all', type: 'all', packageId: 'all' })}
              title="Clear all filters"
            >
              <X data-icon="inline-start" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
