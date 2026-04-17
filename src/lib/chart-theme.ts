export const CHART_GRID = "var(--chart-grid)";
export const CHART_AXIS = "var(--chart-axis)";

export const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid var(--chart-grid)",
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: "13px",
} as const;

export const TOOLTIP_STYLE_SM = {
  borderRadius: "6px",
  border: "1px solid var(--chart-grid)",
  background: "var(--card)",
  color: "var(--foreground)",
  fontSize: "12px",
} as const;
