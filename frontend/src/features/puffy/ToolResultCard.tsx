import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { PuffyStrings } from "./strings";
import type { ActionState, PendingAction, ToolResult } from "./types";

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

function formatAsOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d).replace(/(\d{2})\.(\d{2})$/, "$1:$2");
}

interface CardProps {
  result: ToolResult;
  s: PuffyStrings;
  actionState?: ActionState;
  onAction?: (action: PendingAction, decision: "confirm" | "cancel") => void;
}

/** Kartu hasil tool: angka dan tabel dirender dari data backend, bukan dari teks model. */
export function ToolResultCard({ result, s, actionState, onAction }: CardProps) {
  const { metrics, table, chart } = result;
  return (
    <div className="puffy-result">
      <h4 className="puffy-result__title">{result.title}</h4>

      {!result.hasData ? (
        <p className="puffy-result__empty">{s.noData}</p>
      ) : (
        <>
          {metrics && metrics.length > 0 && (
            <div className="puffy-metrics">
              {metrics.map((m) => (
                <div key={m.label} className="puffy-metric">
                  <strong>{m.value}</strong>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          )}

          {table && table.rows.length > 0 && (
            <div className="puffy-table-wrap">
              <table className="puffy-table">
                <thead>
                  <tr>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {chart && chart.points.length > 0 && (
            <div className="puffy-chart">
              <p>{chart.title}</p>
              <div className="puffy-chart__box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--color-primary-soft)" }}
                      contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <p className="puffy-result__source">{s.asOf} {formatAsOf(result.asOf)} · {result.source}</p>

      {result.action && onAction && (
        <ActionConfirm action={result.action} state={actionState ?? "pending"} s={s} onDecision={(d) => onAction(result.action!, d)} />
      )}
    </div>
  );
}

function ActionConfirm({ action, state, s, onDecision }: {
  action: PendingAction;
  state: ActionState;
  s: PuffyStrings;
  onDecision: (d: "confirm" | "cancel") => void;
}) {
  if (state === "done") return <p role="status" className="alert alert--success puffy-action">✓ {action.label} — {s.done}</p>;
  if (state === "cancelled") return <p className="puffy-action puffy-action--muted">{s.cancelled}</p>;
  const busy = state === "confirming";
  return (
    <div className="alert alert--info puffy-action puffy-action--ask">
      <p><b>{s.willDo}</b> {action.description}. {s.confirmQ}</p>
      {state === "failed" && <p role="alert" className="puffy-action__error">{s.failed}</p>}
      <div className="puffy-action__buttons">
        <button type="button" className="button button--secondary" disabled={busy} onClick={() => onDecision("cancel")}>{s.cancel}</button>
        <button type="button" className="button button--primary" disabled={busy} onClick={() => onDecision("confirm")}>
          {busy ? s.processing : s.proceed}
        </button>
      </div>
    </div>
  );
}
