"use client";

import { useState, useTransition } from "react";
import type { EmailSubscriber } from "@/lib/email/subscribers";

type Props = {
  initialSubscribers: EmailSubscriber[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SubscribersManager({ initialSubscribers }: Props) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const r = await fetch("/api/email/subscribers");
    if (r.ok) {
      const j = await r.json();
      setSubscribers(j.subscribers);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ ok: false, msg: "Vul een e-mailadres in." });
      return;
    }
    startTransition(async () => {
      const r = await fetch("/api/email/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ ok: false, msg: j.error || "Aanmelden mislukt" });
        return;
      }
      if (j.created) {
        setStatus({ ok: true, msg: `✓ ${j.email} is toegevoegd aan de lijst.` });
      } else if (j.reactivated) {
        setStatus({ ok: true, msg: `✓ ${j.email} is opnieuw geactiveerd.` });
      } else {
        setStatus({ ok: true, msg: `${j.email} stond al op de lijst.` });
      }
      setEmail("");
      refresh();
    });
  }

  async function removeSubscriber(sub: EmailSubscriber) {
    if (!confirm(`Abonnee "${sub.email}" definitief verwijderen?`)) return;
    const r = await fetch(`/api/email/subscribers/${sub.id}`, { method: "DELETE" });
    if (r.ok) refresh();
  }

  const activeCount = subscribers.filter((s) => !s.unsubscribed_at).length;

  return (
    <div className="space-y-4">
      {/* Aanmelden formulier */}
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-exit-border bg-card p-5 shadow-sm"
      >
        <label className="block text-sm font-medium text-foreground">
          Aanmelden voor het indexing-rapport
        </label>
        <p className="mt-1 text-xs text-muted">
          Het adres ontvangt voortaan alle geplande rapporten. Uitschrijven kan
          later via de link onderaan iedere mail.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@voorbeeld.nl"
            className="flex-1 rounded-lg border border-exit-border bg-card px-3 py-2 text-sm focus:border-exit-green focus:outline-none focus:ring-1 focus:ring-exit-green"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-exit-green px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-exit-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Aanmelden…" : "Aanmelden"}
          </button>
        </div>
        {status && (
          <p
            className={`mt-3 text-sm ${
              status.ok ? "text-green-600" : "text-red-500"
            }`}
          >
            {status.msg}
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
            {subscribers.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
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
                </div>
                <button
                  type="button"
                  onClick={() => removeSubscriber(s)}
                  className="rounded-lg border border-red-200 bg-card px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:border-red-400 hover:bg-red-50"
                >
                  Verwijder
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
