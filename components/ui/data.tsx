import type { ReactNode } from "react";

type TableColumn = {
  id: string;
  label: string;
};

type TableRow = {
  id: string;
  cells: Record<string, ReactNode>;
};

type TableProps = {
  title?: string;
  columns: TableColumn[];
  rows: TableRow[];
  emptyMessage?: string;
};

export function Table({ title, columns, rows, emptyMessage = "No data" }: TableProps) {
  return (
    <div className="stack-vertical gap-2">
      {title && <div className="text-xs font-semibold text-muted uppercase">{title}</div>}
      <div className="scroll-x bordered-box">
        <table className="text-xs ui-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="ui-th">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="ui-td ui-td-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.id} className="ui-td">
                      {row.cells[col.id]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="preview-placeholder">
      {title && <div className="font-medium text-sm">{title}</div>}
      {description && <div className="text-xs text-muted">{description}</div>}
    </div>
  );
}

type ChartSeries = {
  id: string;
  label: string;
  values: number[];
};

type ChartProps = {
  title?: string;
  series: ChartSeries[];
};

export function Chart({ title, series }: ChartProps) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  return (
    <div className="stack-vertical gap-2">
      {title && <div className="text-xs font-semibold text-muted uppercase">{title}</div>}
      <div className="bordered-box stack-vertical gap-2">
        {series.length === 0 ? (
          <div className="text-xs text-muted">No chart data</div>
        ) : (
          series.map((s) => (
            <div key={s.id} className="stack-vertical gap-1">
              <div className="text-xs text-muted">{s.label}</div>
              <div className="stack-horizontal gap-1">
                {s.values.map((v, idx) => {
                  const ratio = v / max;
                  const level =
                    ratio >= 0.9 ? 5 : ratio >= 0.7 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.3 ? 2 : 1;
                  return <div key={idx} className={`chart-bar chart-bar-l${level}`} />;
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

