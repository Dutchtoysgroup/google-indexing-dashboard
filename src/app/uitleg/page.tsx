import { SHOP_INFO } from "@/lib/shops";

export default function UitlegPage() {
  const shops = Object.entries(SHOP_INFO);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Uitleg</h1>
        <p className="mt-1 text-muted">
          Hoe het EXIT Toys Indexing Dashboard werkt en wat de cijfers betekenen.
        </p>
      </div>

      {/* Wat doet deze tool? */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-3">Wat doet deze tool?</h2>
        <p className="text-sm text-foreground leading-relaxed">
          Het Indexing Dashboard monitort de Google-indexeringsstatus van alle EXIT Toys webshops.
          Het controleert automatisch of productpagina&apos;s, collectiepagina&apos;s en andere URLs
          zijn opgenomen in de Google zoekindex. URLs die niet geindexeerd zijn, worden automatisch
          aangemeld bij Google via de Indexing API.
        </p>
      </section>

      {/* Hoe werkt het? */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Hoe werkt het?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "1",
              title: "Sitemaps scannen",
              desc: "Alle URLs worden verzameld uit de XML sitemaps van elke webshop (producten, collecties, pagina's, blogs, FAQ's).",
            },
            {
              step: "2",
              title: "URL Inspectie",
              desc: "Via de Google URL Inspection API wordt de indexeringsstatus van elke URL gecontroleerd (geindexeerd, niet geindexeerd, onbekend).",
            },
            {
              step: "3",
              title: "Indexeringsverzoek versturen",
              desc: "URLs die niet geindexeerd zijn, worden aangemeld bij Google via de Indexing API met een URL_UPDATED notificatie.",
            },
            {
              step: "4",
              title: "Snapshot opslaan",
              desc: "Dagelijks worden de statistieken opgeslagen zodat trends over tijd zichtbaar worden in het dashboard.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border border-exit-border/50 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-exit-green text-sm font-bold text-white">
                {item.step}
              </div>
              <h3 className="font-medium text-foreground">{item.title}</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-exit-green-50 p-4">
          <p className="text-sm text-exit-green-dark">
            <strong>Automatisch:</strong> De pipeline draait dagelijks om 04:00 (NL tijd) via een launchd cron-job op de Mac Mini.
            Bij nieuwe producten of wijzigingen worden URLs automatisch opgepikt bij de volgende run.
          </p>
        </div>
      </section>

      {/* Wat betekenen de cijfers? */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Wat betekenen de cijfers?</h2>
        <div className="space-y-3">
          {[
            {
              label: "Totaal URLs",
              desc: "Alle actieve URLs gevonden in de sitemaps van alle webshops.",
              color: "bg-slate-500",
            },
            {
              label: "Geindexeerd",
              desc: "URLs met verdict PASS — deze staan in de Google zoekindex en zijn vindbaar.",
              color: "bg-green-500",
            },
            {
              label: "Niet geindexeerd",
              desc: "URLs die gecontroleerd zijn maar niet in de Google index staan. De reden staat in de 'coverage state' (bijv. 'Crawled - currently not indexed').",
              color: "bg-red-500",
            },
            {
              label: "Niet gecheckt",
              desc: "URLs die nog nooit via de URL Inspection API zijn gecontroleerd. Het systeem werkt deze geleidelijk bij.",
              color: "bg-yellow-500",
            },
            {
              label: "Coverage",
              desc: "Percentage geindexeerde URLs ten opzichte van het totaal. Hoe hoger, hoe beter vindbaar de shop is.",
              color: "bg-exit-green",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg border border-exit-border/30 p-3">
              <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${item.color}`} />
              <div>
                <h3 className="text-sm font-medium text-foreground">{item.label}</h3>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API Limieten */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">API Limieten</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-exit-green-50 p-4">
            <h3 className="font-medium text-exit-green-dark">Indexing API (Indexeringsverzoeken)</h3>
            <p className="mt-1 text-2xl font-bold text-exit-green">200 / dag</p>
            <p className="mt-1 text-xs text-muted">Totaal over alle shops. Reset om middernacht Pacific Time (09:00 NL).</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="font-medium text-blue-700">URL Inspection API</h3>
            <p className="mt-1 text-2xl font-bold text-blue-600">2.000 / dag</p>
            <p className="mt-1 text-xs text-muted">Per property. Standaard 15 per shop per run, instelbaar via config.</p>
          </div>
        </div>
      </section>

      {/* Webshops */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Webshops ({shops.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map(([id, info]) => (
            <div key={id} className="flex items-center gap-3 rounded-lg border border-exit-border/50 p-3">
              <span className="text-xl">{info.flag}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{info.name}</p>
                <p className="text-xs text-muted">{info.domain}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-exit-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Veelgestelde vragen</h2>
        <div className="space-y-4">
          {[
            {
              q: "Hoe lang duurt het voordat een ingediende URL geindexeerd wordt?",
              a: "Dit varieert. Sommige URLs worden binnen een paar uur opgepikt, andere kunnen dagen duren. De tool stuurt automatisch opnieuw een indexeringsverzoek na 3 dagen als een URL nog steeds niet geindexeerd is.",
            },
            {
              q: "Waarom is mijn coverage percentage laag?",
              a: "Een lage coverage kan meerdere oorzaken hebben: nieuwe URLs die nog niet gecheckt zijn, URLs die Google om technische redenen niet indexeert (bijv. duplicate content, soft 404), of URLs die recent zijn toegevoegd.",
            },
            {
              q: "Wat betekent 'Crawled - currently not indexed'?",
              a: "Google heeft de pagina bezocht maar besloten om deze (nog) niet in de index op te nemen. Dit kan komen door kwaliteitsbeoordeling. De tool blijft voor deze URLs indexeringsverzoeken versturen.",
            },
            {
              q: "Kan ik de tool handmatig draaien?",
              a: "Ja, via de CLI: 'python cli.py run' voor de volledige pipeline, of 'python cli.py inspect' / 'python cli.py push' voor specifieke stappen.",
            },
            {
              q: "Hoe vaak wordt de data ververst?",
              a: "De pipeline draait dagelijks om 04:00 (NL tijd) via een launchd cron-job op de Mac Mini. Het dashboard toont altijd de meest recente data bij elk bezoek.",
            },
          ].map((faq) => (
            <div key={faq.q} className="rounded-lg border border-exit-border/30 p-4">
              <h3 className="text-sm font-medium text-foreground">{faq.q}</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
