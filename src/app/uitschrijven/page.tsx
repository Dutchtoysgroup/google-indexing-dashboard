import Link from "next/link";
import { findByToken, unsubscribeByToken } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UitschrijvenPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-xl border border-brand-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Geen token meegegeven</h1>
          <p className="mt-2 text-sm text-muted">
            Deze link is niet volledig. Gebruik de uitschrijf-link uit de e-mail die je hebt ontvangen.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Look up once for display; if already unsubscribed we show a friendly message.
  const existing = await findByToken(token);

  if (!existing) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-xl border border-brand-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Link ongeldig</h1>
          <p className="mt-2 text-sm text-muted">
            We konden geen abonnement vinden bij deze uitschrijf-link. Mogelijk is het al verwijderd.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    );
  }

  const alreadyUnsubscribed = existing.unsubscribed_at !== null;
  const result = alreadyUnsubscribed ? existing : await unsubscribeByToken(token);
  const email = result?.email ?? existing.email;

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="rounded-xl border border-brand-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-green"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          {alreadyUnsubscribed ? "Al uitgeschreven" : "Uitgeschreven"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          <span className="font-mono text-foreground">{email}</span> ontvangt{" "}
          {alreadyUnsubscribed ? "al" : "vanaf nu"} geen rapport-mails meer.
        </p>
        <p className="mt-4 text-xs text-muted">
          Van gedachten veranderd? Meld je op elk moment opnieuw aan via de
          instellingen-pagina.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
}
