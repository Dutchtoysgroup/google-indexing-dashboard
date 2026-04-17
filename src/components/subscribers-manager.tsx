"use client";

import { useState, useTransition } from "react";
import type { SubscriberWithSchedules } from "@/lib/email/subscribers";
import type { EmailSchedule } from "@/lib/email/schedules";

const DAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

type Props = {
  initialSubscribers: SubscriberWithSchedules[];
  schedules: EmailSchedule[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function describeSchedule(s: EmailSchedule): string {
  const time = s.time_of_day.slice(0, 5);
  let days: string;
  if (s.days_of_week.length === 7) days = "iedere dag";
  else if (
    s.days_of_week.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => s.days_of_week.includes(d))
  )
    days = "weekdagen";
  else days = s.days_of_week.map((d) => DAY_SHORT[d - 1]).join(", ");
  return `${time} · ${days}`;
}

export function SubscribersManager({ initialSubscribers, schedules }: Props) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [email, setEmail] = useState("");
  const [selectedForSignup, setSelectedForSignup] = useState<Set<number>>(
    () => new Set(schedules.filter((s) => s.enabled).map((s) => s.id))
  );
  const [signupStatus, setSignupStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [signupPending, startSignup] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSelection, setEditSelection] = useState<Set<number>>(new Set());
  const [editPending, startEdit] = useTransition();
  const [rowStatus, setRowStatus] = useState<Record<number, { ok: boolean; msg: string }>>({});

  async function refresh() {
    const r = await fetch("/api/email/subscribers");
    if (r.ok) {
      const j = await r.json();
      setSubscribers(j.subscribers);
    }
  }

  function toggle(set: Set<number>, id: number): Set<number> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function onSubmitSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupStatus(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setSignupStatus({ ok: false, msg: "Vul een e-mailadres in." });
      return;
    }
    if (selectedForSignup.size === 0) {
      setSignupStatus({ ok: false, msg: "Selecteer minimaal één schedule." });
      return;
    }
    startSignup(async () => {
      const r = await fetch("/api/email/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          scheduleIds: [...selectedForSignup],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSignupStatus({ ok: false, msg: j.error || "Aanmelden mislukt" });
        return;
      }
      if (j.created) {
        setSignupStatus({ ok: true, msg: `✓ ${j.email} is toegevoegd.` });
      } else if (j.reactivated) {
        setSignupStatus({ ok: true, msg: `✓ ${j.email} is opnieuw geactiveerd.` });
      } else {
        setSignupStatus({ ok: true, msg: `${j.email} stond al op de lijst — keuzes bijgewerkt.` });
      }
      setEmail("");
      refresh();
    });
  }

  function startEditing(sub: SubscriberWithSchedules) {
    setEditingId(sub.id);
    setEditSelection(new Set(sub.schedule_ids));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditSelection(new Set());
  }

  function saveEditing(sub: SubscriberWithSchedules) {
    startEdit(async () => {
      const r = await fetch(`/api/email/subscribers/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleIds: [...editSelection] }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setRowStatus((p) => ({ ...p, [sub.id]: { ok: false, msg: j.error || "Opslaan mislukt" } }));
        return;
      }
      cancelEditing();
      refresh();
      setRowStatus((p) => ({ ...p, [sub.id]: { ok: true, msg: "Keuzes bijgewerkt." } }));
    });
  }

  async function removeSubscriber(sub: SubscriberWithSchedules) {
    if (!confirm(`Abonnee "${sub.email}" definitief verwijderen?`)) return;
    const r = await fetch(`/api/email/subscribers/${sub.id}`, { method: "DELETE" });
    if (r.ok) refresh();
  }

  async function sendTestTo(sub: SubscriberWithSchedules) {
    setRowStatus((p) => ({ ...p, [sub.id]: { ok: true, msg: "Versturen…" } }));
    const r = await fetch(`/api/email/subscribers/${sub.id}/test`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setRowStatus((p) => ({ ...p, [sub.id]: { ok: true, msg: `✓ Testmail naar ${j.email}` } }));
    } else {
      setRowStatus((p) => ({ ...p, [sub.id]: { ok: false, msg: j.error || "Versturen mislukt" } }));
    }
  }

  const activeCount = subscribers.filter((s) => !s.unsubscribed_at).length;
  const enabledSchedules = schedules.filter((s) => s.enabled);

  return (
    <div className="space-y-4">
      {/* Aanmelden formulier */}
      <form
        onSubmit={onSubmitSignup}
        className="rounded-xl border border-exit-border bg-card p-5 shadow-sm"
      >
        <label className="block text-sm font-medium text-foreground">
          Aanmelden voor het indexing-rapport
        </label>
        <p className="mt-1 text-xs text-muted">
          Selecteer hieronder op welke schedules je geabonneerd wil worden. Uitschrijven
          kan later via de link onderaan iedere mail.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@voorbeeld.nl"
          className="mt-3 w-full rounded-lg border border-exit-border bg-card px-3 py-2 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
        />

        <p className="mt-4 text-xs font-medium text-muted">Schedules</p>
        {enabledSchedules.length === 0 ? (
          <p className="mt-2 rounded-lg border border-exit-border/50 bg-exit-green-50 p-3 text-xs text-muted">
            Nog geen actieve schedules. Maak er eerst een aan in de sectie hieronder.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {enabledSchedules.map((s) => (
              <label
                key={s.id}
                className="flex items-start gap-3 cursor-pointer rounded-lg border border-exit-border/50 p-3 hover:border-exit-green-200"
              >
                <input
                  type="checkbox"
                  checked={selectedForSignup.has(s.id)}
                  onChange={() => setSelectedForSignup((prev) => toggle(prev, s.id))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-exit-green"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted">{describeSchedule(s)}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={signupPending || enabledSchedules.length === 0}
          className="mt-4 rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-exit-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signupPending ? "Aanmelden…" : "Aanmelden"}
        </button>
        {signupStatus && (
          <p className={`mt-3 text-sm ${signupStatus.ok ? "text-green-600" : "text-red-500"}`}>
            {signupStatus.msg}
          </p>
        )}
      </form>

      {/* Lijst */}
      <div className="rounded-xl border border-exit-border bg-card shadow-sm">
        <div className="border-b border-exit-border p-4">
          <h3 className="font-semibold text-foreground">
            Abonnees ({activeCount} actief
            {subscribers.length - activeCount > 0
              ? `, ${subscribers.length - activeCount} uitgeschreven`
              : ""}
            )
          </h3>
        </div>
        {subscribers.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">
            Nog geen abonnees. Voeg er hierboven een toe.
          </p>
        ) : (
          <ul className="divide-y divide-exit-border/40">
            {subscribers.map((s) => {
              const isEditing = editingId === s.id;
              const linkedNames = s.schedule_ids
                .map((id) => schedules.find((sch) => sch.id === id)?.name)
                .filter(Boolean) as string[];
              const rs = rowStatus[s.id];
              return (
                <li key={s.id} className="p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            s.unsubscribed_at ? "bg-slate-300" : "bg-green-500"
                          }`}
                        />
                        <p className="truncate font-mono text-sm text-foreground">
                          {s.email}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Aangemeld {formatDate(s.subscribed_at)}
                        {s.unsubscribed_at && (
                          <> · uitgeschreven {formatDate(s.unsubscribed_at)}</>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {linkedNames.length > 0
                          ? `Ontvangt: ${linkedNames.join(", ")}`
                          : "Geen schedules gekoppeld — ontvangt niets."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!s.unsubscribed_at && !isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => sendTestTo(s)}
                            className="rounded-lg border border-exit-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-exit-green-200"
                          >
                            Testmail
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(s)}
                            className="rounded-lg border border-exit-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-exit-green-200"
                          >
                            Bewerk keuzes
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSubscriber(s)}
                        className="rounded-lg border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:bg-red-50"
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-lg border border-exit-border/50 bg-exit-green-50 p-3 space-y-2">
                      {enabledSchedules.length === 0 ? (
                        <p className="text-xs text-muted">
                          Geen actieve schedules beschikbaar.
                        </p>
                      ) : (
                        enabledSchedules.map((sch) => (
                          <label
                            key={sch.id}
                            className="flex items-start gap-3 cursor-pointer rounded-md p-2 hover:bg-card"
                          >
                            <input
                              type="checkbox"
                              checked={editSelection.has(sch.id)}
                              onChange={() => setEditSelection((prev) => toggle(prev, sch.id))}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-exit-green"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{sch.name}</p>
                              <p className="text-xs text-muted">{describeSchedule(sch)}</p>
                            </div>
                          </label>
                        ))
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => saveEditing(s)}
                          disabled={editPending}
                          className="rounded-lg bg-exit-green px-3 py-1.5 text-xs font-medium text-white hover:bg-exit-green-dark disabled:opacity-50"
                        >
                          {editPending ? "Opslaan…" : "Opslaan"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-lg border border-exit-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-exit-green-200"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}

                  {rs && (
                    <p className={`text-xs ${rs.ok ? "text-green-600" : "text-red-500"}`}>
                      {rs.msg}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
