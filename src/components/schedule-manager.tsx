"use client";

import { useState } from "react";
import type { EmailSchedule, EmailLogEntry } from "@/lib/email/schedules";

const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const DAY_FULL = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const PRESETS: Array<{ label: string; days: number[] }> = [
  { label: "Iedere dag", days: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Weekdagen", days: [1, 2, 3, 4, 5] },
  { label: "Weekend", days: [6, 7] },
  { label: "Wekelijks (ma)", days: [1] },
];

type Props = {
  initialSchedules: EmailSchedule[];
  initialLog: EmailLogEntry[];
};

export function ScheduleManager({ initialSchedules, initialLog }: Props) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [log] = useState(initialLog);

  // Form state
  const [name, setName] = useState("Dagelijks ochtendrapport");
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function refreshAll() {
    const r = await fetch("/api/email/schedules");
    if (r.ok) {
      const j = await r.json();
      setSchedules(j.schedules);
    }
  }

  async function createScheduleHandler(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) return setFormError("Geef een naam op.");
    if (days.length === 0) return setFormError("Selecteer minimaal 1 dag.");

    const r = await fetch("/api/email/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), time_of_day: time, days_of_week: days }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return setFormError(j.error || "Aanmaken mislukt");
    }
    setName("");
    setTime("08:00");
    setDays([1, 2, 3, 4, 5, 6, 7]);
    refreshAll();
  }

  async function toggleEnabled(s: EmailSchedule) {
    const r = await fetch(`/api/email/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    if (r.ok) refreshAll();
  }

  async function deleteScheduleHandler(s: EmailSchedule) {
    if (!confirm(`Schedule "${s.name}" verwijderen?`)) return;
    const r = await fetch(`/api/email/schedules/${s.id}`, { method: "DELETE" });
    if (r.ok) refreshAll();
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <section className="rounded-xl border border-exit-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Nieuwe schedule</h2>
        <form onSubmit={createScheduleHandler} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted">Naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-exit-border bg-card px-3 py-2 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted">
              Tijd (uurresolutie — alleen het hele uur telt)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              step={3600}
              className="mt-1 w-full rounded-lg border border-exit-border bg-card px-3 py-2 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted">Snelle keuze</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setDays(p.days)}
                  className="rounded-full border border-exit-border bg-exit-green-50 px-3 py-1 text-xs text-foreground transition-colors hover:border-exit-green hover:bg-exit-green-100"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted">Dagen</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, idx) => {
                const dayNum = idx + 1; // 1=ma..7=zo
                const active = days.includes(dayNum);
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleDay(dayNum)}
                    className={`h-9 w-12 rounded-lg border text-sm font-medium transition-colors ${
                      active
                        ? "border-exit-green bg-exit-green text-white"
                        : "border-exit-border bg-card text-muted hover:border-exit-green-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {formError && <p className="text-sm text-red-500 sm:col-span-2">{formError}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-exit-green-dark"
            >
              Schedule toevoegen
            </button>
          </div>
        </form>
      </section>

      {/* Schedules lijst */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Bestaande schedules ({schedules.length})
        </h2>
        {schedules.length === 0 ? (
          <p className="rounded-xl border border-exit-border bg-card p-6 text-center text-sm text-muted">
            Nog geen schedules. Voeg er één toe hierboven.
          </p>
        ) : (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border border-exit-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        s.enabled ? "bg-green-500" : "bg-slate-300"
                      }`}
                    />
                    <p className="truncate font-medium text-foreground">{s.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {s.time_of_day.slice(0, 5)} ·{" "}
                    {s.days_of_week.length === 7
                      ? "iedere dag"
                      : s.days_of_week.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days_of_week.includes(d))
                      ? "weekdagen"
                      : s.days_of_week.map((d) => DAY_FULL[d - 1]).join(", ")}
                    {s.last_sent_at && (
                      <> · laatst verzonden {new Date(s.last_sent_at).toLocaleString("nl-NL")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(s)}
                    className="rounded-lg border border-exit-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-exit-green-200"
                  >
                    {s.enabled ? "Pauzeer" : "Activeer"}
                  </button>
                  <button
                    onClick={() => deleteScheduleHandler(s)}
                    className="rounded-lg border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:bg-red-50"
                  >
                    Verwijder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Log */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Recente verzendingen</h2>
        {log.length === 0 ? (
          <p className="rounded-xl border border-exit-border bg-card p-6 text-center text-sm text-muted">
            Nog niets verzonden.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-exit-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-exit-green-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Tijd</th>
                  <th className="px-4 py-2 text-left font-medium">Onderwerp</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => (
                  <tr key={entry.id} className="border-t border-exit-border">
                    <td className="px-4 py-2 text-muted">
                      {new Date(entry.sent_at).toLocaleString("nl-NL")}
                    </td>
                    <td className="px-4 py-2 text-foreground">{entry.subject}</td>
                    <td className="px-4 py-2">
                      {entry.status === "sent" ? (
                        <span className="text-green-600">✓ Verzonden</span>
                      ) : (
                        <span className="text-red-500" title={entry.error ?? undefined}>
                          ✗ Mislukt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
