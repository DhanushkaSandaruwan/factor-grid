'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

/**
 * Heatmap of issue counts for two risk attributes. Cell shade follows the
 * count, so the most crowded combinations stand out.
 * @param {{ projectId: string, riskAttributes: string[] }} props
 */
export function RiskMatrixCard({ projectId, riskAttributes }) {
  const [x, setX] = useState(riskAttributes[0] ?? '');
  const [y, setY] = useState(riskAttributes[1] ?? '');
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!x || !y || x === y) return;
    let active = true;
    setLoading(true);
    fetch(`/api/projects/${projectId}/risk-matrix?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setError(data.error);
          setMatrix(null);
        } else {
          setError(null);
          setMatrix(data);
        }
      })
      .catch(() => active && setError('Could not load the risk matrix.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId, x, y]);

  if (riskAttributes.length < 2) {
    return (
      <Card className="[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>Risk matrix</CardTitle>
          <CardDescription className="text-xs">
            Add at least two risk attributes to see the matrix.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const max = matrix ? Math.max(1, ...matrix.cells.map((c) => c.count)) : 1;
  const countAt = (xv, yv) => matrix?.cells.find((c) => c.x === xv && c.y === yv)?.count ?? 0;

  return (
    <Card className="[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle>Risk matrix</CardTitle>
        <CardDescription className="text-xs">Issues by two risk attributes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select size="sm" aria-label="Column attribute" value={x} onChange={(e) => setX(e.target.value)}>
            {riskAttributes.map((name) => (
              <option key={name} value={name}>
                {name} →
              </option>
            ))}
          </Select>
          <Select size="sm" aria-label="Row attribute" value={y} onChange={(e) => setY(e.target.value)}>
            {riskAttributes.map((name) => (
              <option key={name} value={name}>
                ↓ {name}
              </option>
            ))}
          </Select>
        </div>

        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        {loading && !matrix ? <Spinner className="text-muted-foreground size-4" /> : null}

        {matrix && matrix.xValues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-center text-xs">
              <thead>
                <tr>
                  <th className="text-muted-foreground p-1 text-left font-normal">
                    {matrix.yName} \ {matrix.xName}
                  </th>
                  {matrix.xValues.map((xv) => (
                    <th key={xv} className="text-muted-foreground font-mono font-normal">
                      {xv}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...matrix.yValues].reverse().map((yv) => (
                  <tr key={yv}>
                    <th className="text-muted-foreground pr-2 font-mono font-normal">{yv}</th>
                    {matrix.xValues.map((xv) => {
                      const count = countAt(xv, yv);
                      const shade = count === 0 ? 0 : Math.round(15 + (count / max) * 60);
                      return (
                        <td
                          key={xv}
                          title={`${matrix.yName} ${yv} · ${matrix.xName} ${xv}: ${count} issue(s)`}
                          className="rounded-md py-1.5 font-mono font-semibold tabular-nums"
                          style={{
                            background:
                              count === 0
                                ? 'var(--muted)'
                                : `color-mix(in oklab, var(--primary) ${shade}%, transparent)`,
                            color: shade > 45 ? 'var(--primary-foreground)' : 'var(--foreground)',
                          }}
                        >
                          {count || ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted-foreground mt-2 text-[0.7rem]">{matrix.total} issue(s) counted.</p>
          </div>
        ) : matrix ? (
          <p className="text-muted-foreground text-xs">No issues to plot yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
