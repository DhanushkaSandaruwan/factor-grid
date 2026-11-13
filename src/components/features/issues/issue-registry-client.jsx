'use client';

import { useMemo, useState } from 'react';
import { IssueList } from './issue-list';
import { IssueDetailsColumn } from './issue-details-column';
import { IssueRecommendationsPanel } from './issue-recommendations-panel';
import { IssueRequirementsPanel } from './issue-requirements-panel';
import { IssueAttributesPanel } from './issue-attributes-panel';
import { AddIssueDialog } from './add-issue-dialog';
import { RegistryToolbar } from './registry-toolbar';

const DEFAULT_FILTERS = { status: 'all', type: 'all', packageId: 'all' };

/**
 * Client component — receives server-fetched data as props, manages selected
 * issue state, issue list filters and the selected recommendation, and
 * composes the registry layout (toolbar + three-column body).
 *
 * The body scrolls horizontally on narrower screens instead of clipping its
 * columns, so every panel stays reachable.
 *
 * @param {{ projectId: string, projectTitle: string, issueIdPrefix: string, initialIssues: object[], initialLinks: object[], projectPackages: object[], riskAttributes: string[], actionAttributes: string[], actionValueOptions: Record<string, string[]> }} props
 */
export function IssueRegistryClient({
  projectId,
  projectTitle,
  issueIdPrefix,
  initialIssues,
  initialLinks,
  projectPackages,
  riskAttributes,
  actionAttributes,
  actionValueOptions,
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [links, setLinks] = useState(initialLinks);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState(null);

  // Next display ID derived from state so it advances after each creation.
  const nextIssueId = useMemo(() => {
    const maxNumber = issues.reduce((max, issue) => Math.max(max, issue.issueNumber ?? 0), 0);
    return `${issueIdPrefix}-${String(maxNumber + 1).padStart(3, '0')}`;
  }, [issues, issueIdPrefix]);

  // Issues visible in the list after applying the toolbar filters.
  const filteredIssues = useMemo(() => {
    const packageFilter = filters.packageId;
    return issues.filter((issue) => {
      if (filters.status !== 'all' && issue.status !== filters.status) return false;
      if (filters.type !== 'all' && (issue.issueType ?? '') !== filters.type) return false;
      if (
        packageFilter !== 'all' &&
        !(issue.packages ?? []).some((pkg) =>
          typeof pkg === 'object' ? pkg._id === packageFilter : String(pkg) === packageFilter
        )
      ) {
        return false;
      }
      return true;
    });
  }, [issues, filters]);

  function handleSelectIssue(issue) {
    const isDeselect = selectedIssue?._id === issue._id;
    setSelectedIssue(isDeselect ? null : issue);
    // Default to the issue's first recommendation so its requirements load.
    setSelectedRecommendationId(isDeselect ? null : issue.recommendations?.[0]?._id ?? null);
  }

  function handleIssueCreated(issue) {
    setIssues((prev) => [issue, ...prev]);
  }

  function handleIssueUpdated(updatedIssue) {
    setIssues((prev) => prev.map((i) => (i._id === updatedIssue._id ? updatedIssue : i)));
    setSelectedIssue(updatedIssue);
    // Keep the recommendation selection valid: preserve it when the
    // recommendation still exists, otherwise fall back to the first one.
    setSelectedRecommendationId((prev) => {
      const recs = updatedIssue.recommendations ?? [];
      return recs.some((rec) => rec._id === prev) ? prev : recs[0]?._id ?? null;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RegistryToolbar
        projectId={projectId}
        issues={issues}
        projectPackages={projectPackages}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="scrollbar-refined flex min-h-0 flex-1 overflow-x-auto">
        <div className="flex min-h-0 min-w-[62rem] flex-1">
          {/* Left column — action bar + scrollable issue list */}
          <div className="border-border/70 bg-card flex w-[19rem] shrink-0 flex-col border-r">
            <div className="border-border/70 flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="eyebrow">Issues</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  <span className="text-foreground font-mono font-semibold tabular-nums">
                    {filteredIssues.length}
                  </span>{' '}
                  of {issues.length} registered
                </p>
              </div>
              <AddIssueDialog
                projectId={projectId}
                projectPackages={projectPackages}
                nextIssueId={nextIssueId}
                onIssueCreated={handleIssueCreated}
              />
            </div>

            <div className="scrollbar-refined flex-1 overflow-y-auto">
              <IssueList issues={filteredIssues} selectedIssue={selectedIssue} onSelectIssue={handleSelectIssue} />
            </div>
          </div>

          {/* Middle column — type, Description & Consequences of the selected issue */}
          <div className="border-border/70 bg-card flex w-[19rem] shrink-0 flex-col border-r">
            <IssueDetailsColumn
              issue={selectedIssue}
              projectId={projectId}
              projectPackages={projectPackages}
              onIssueUpdated={handleIssueUpdated}
            />
          </div>

          {/* Right column — recommendations & requirements above the attributes cards */}
          <div className="bg-card/60 flex min-w-0 flex-1 flex-col">
            {selectedIssue ? (
              <div className="flex min-h-0 flex-1">
                <div className="border-border/70 flex w-60 shrink-0 flex-col border-r">
                  <IssueRecommendationsPanel
                    projectId={projectId}
                    issueId={selectedIssue._id}
                    recommendations={selectedIssue.recommendations ?? []}
                    selectedRecommendationId={selectedRecommendationId}
                    onSelectRecommendation={setSelectedRecommendationId}
                    onIssueUpdated={handleIssueUpdated}
                  />
                </div>

                <IssueRequirementsPanel
                  projectId={projectId}
                  issueId={selectedIssue._id}
                  recommendations={selectedIssue.recommendations ?? []}
                  links={links}
                  projectPackages={projectPackages}
                  projectIssues={issues}
                  selectedRecommendationId={selectedRecommendationId}
                  onIssueUpdated={handleIssueUpdated}
                  onLinksChanged={setLinks}
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="px-6 text-center">
                  <p className="text-foreground text-sm font-medium">No issue selected</p>
                  <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
                    Select an issue from the list to manage its recommendations, requirements and attributes.
                  </p>
                </div>
              </div>
            )}
            {selectedIssue && (
              <IssueAttributesPanel
                key={selectedIssue._id}
                projectId={projectId}
                issueId={selectedIssue._id}
                riskAttributes={riskAttributes}
                actionAttributes={actionAttributes}
                actionValueOptions={actionValueOptions}
                initialRiskValues={selectedIssue.riskAttributeValues ?? {}}
                initialActionValues={selectedIssue.actionAttributeValues ?? {}}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
