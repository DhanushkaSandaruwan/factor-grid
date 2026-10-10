'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { BackButton } from '@/components/features/projects/back-button';
import { Button } from '@/components/ui/button';

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

const selectClass =
  'bg-background text-foreground border-input focus:border-ring focus:ring-ring/10 h-8 rounded-md border px-2 pr-7 text-xs shadow-xs transition-colors outline-none';

/**
 * One inline stat: muted label + prominent count.
 */
function Stat({ label, value }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground text-xs font-semibold">{label}</span>
      <span className="text-foreground text-sm font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function StatDivider() {
  return <div className="bg-border h-5 w-px" aria-hidden="true" />;
}

/**
 * Registry toolbar: back button, centered project-wide stats (issues,
 * recommendations, requirements, evidence) and the issue list filters
 * (status, type, package) with a clear-all action. Stats always cover every
 * issue in the project; filters only affect the issue list.
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
    <div className="bg-card border-border border-b px-6 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <BackButton fallbackHref={`/projects/${projectId}`} />

        <StatDivider />

        {/* Centered stats: issues | recommendations | requirements | evidence */}
        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stat label="Total Issues" value={stats.total} />
            <Stat label="Open" value={stats.open} />
            <Stat label="Closed" value={stats.closed} />
          </div>

          <StatDivider />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stat label="Recommendations" value={stats.totalRecommendations} />
            <Stat label="Rec. Open" value={stats.recommendationsOpen} />
            <Stat label="Rec. Closed" value={stats.recommendationsClosed} />
          </div>

          <StatDivider />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Stat label="Requirements" value={stats.totalRequirements} />
            <Stat label="Req. Open" value={stats.requirementsOpen} />
            <Stat label="Req. Closed" value={stats.requirementsClosed} />
          </div>

          <StatDivider />

          <Stat label="Evidence" value={stats.evidence} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            aria-label="Filter by status"
            title="Filter by status"
            className={selectClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Status: {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => update({ type: e.target.value })}
            aria-label="Filter by type"
            title="Filter by type"
            className={selectClass}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Type: {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.packageId}
            onChange={(e) => update({ packageId: e.target.value })}
            aria-label="Filter by package"
            title="Filter by package"
            className={selectClass}
          >
            <option value="all">Package: All</option>
            {projectPackages.map((pkg) => (
              <option key={pkg._id} value={pkg._id}>
                Package: {pkg.packageId}
              </option>
            ))}
          </select>

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
