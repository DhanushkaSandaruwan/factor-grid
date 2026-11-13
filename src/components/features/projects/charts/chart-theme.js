/**
 * Shared Recharts styling so every chart in the app reads as one system.
 * Colours come from the semantic chart tokens in globals.css.
 */

/** Tooltip surface: frosted card with a soft lift. */
export const TOOLTIP_STYLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  boxShadow: '0 12px 28px -10px rgb(15 23 42 / 0.25)',
  fontSize: '0.75rem',
  padding: '8px 10px',
  color: 'var(--popover-foreground)',
};

/** Axis tick labels. */
export const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' };

/** Grid lines: horizontal only, very light. */
export const GRID_PROPS = { vertical: false, strokeDasharray: '3 4', stroke: 'var(--border)' };

/** Legend item text colour. */
export const LEGEND_TEXT_STYLE = { fontSize: 12, color: 'var(--muted-foreground)' };
