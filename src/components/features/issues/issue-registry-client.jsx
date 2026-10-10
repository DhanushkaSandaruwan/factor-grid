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
    const maxNumber = issues.reduce(
      (max, issue) => Math.max(max, issue.issueNumber ?? 0),
      0
    );
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
    setSelectedRecommendationId(
      isDeselect ? null : issue.recommendations?.[0]?._id ?? null
    );
  }

  function handleIssueCreated(issue) {
    setIssues((prev) => [issue, ...prev]);
  }

  function handleIssueUpdated(updatedIssue) {
    setIssues((prev) =>
      prev.map((i) => (i._id === updatedIssue._id ? updatedIssue : i))
    );
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left column — action bar + scrollable issue list */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border">
          {/* Action bar */}
          <div className="border-b border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground text-sm font-semibold">Issues</p>
                <p className="text-muted-foreground text-xs">
                  {filteredIssues.length} of {issues.length} registered
                </p>
              </div>
              <AddIssueDialog
                projectId={projectId}
                projectPackages={projectPackages}
                nextIssueId={nextIssueId}
                onIssueCreated={handleIssueCreated}
              />
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto scrollbar-refined">
            <IssueList
              issues={filteredIssues}
              selectedIssue={selectedIssue}
              onSelectIssue={handleSelectIssue}
            />
          </div>
        </div>

        {/* Middle column — type, Description & Consequences of the selected issue */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
          <IssueDetailsColumn
            issue={selectedIssue}
            projectId={projectId}
            projectPackages={projectPackages}
            onIssueUpdated={handleIssueUpdated}
          />
        </div>

        {/* Right column — recommendations & requirements above the attributes cards */}
        <div className="flex flex-1 flex-col overflow-hidden bg-card">
          {selectedIssue ? (
            <div className="flex min-h-0 flex-1">
              {/* Recommendations column */}
              <div className="flex w-64 shrink-0 flex-col border-r border-border">
                <IssueRecommendationsPanel
                  projectId={projectId}
                  issueId={selectedIssue._id}
                  recommendations={selectedIssue.recommendations ?? []}
                  selectedRecommendationId={selectedRecommendationId}
                  onSelectRecommendation={setSelectedRecommendationId}
                  onIssueUpdated={handleIssueUpdated}
                />
              </div>

              {/* Requirements section — one row per requirement with links, evidence & status */}
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
                <p className="text-muted-foreground mt-1 text-xs">
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
  );
}
