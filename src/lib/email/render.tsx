import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { SHOP_INFO } from "@/lib/shops";
import type { Report } from "./report-data";

// EXIT brand kleuren - hardcoded omdat e-mailclients geen CSS-variabelen ondersteunen
const c = {
  headerBg: "#1A2E05",
  primary: "#6B8E23",
  primaryLight: "#8AAD3A",
  accent50: "#F4F7EC",
  accent100: "#E3ECCC",
  background: "#F8FAF5",
  card: "#ffffff",
  border: "#E2E8D4",
  text: "#1a2e05",
  muted: "#64748b",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
};

function fmt(n: number): string {
  return n.toLocaleString("nl-NL");
}

function deltaLabel(d: number): string {
  if (d === 0) return "±0";
  return d > 0 ? `+${fmt(d)}` : fmt(d);
}

function deltaColor(d: number): string {
  if (d === 0) return c.muted;
  return d > 0 ? c.green : c.red;
}

type TemplateProps = {
  report: Report;
  baseUrl: string;
  scheduleName?: string | null;
};

export function EmailTemplate({ report, baseUrl, scheduleName }: TemplateProps) {
  const nlDate = new Date(report.generatedAt).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Html lang="nl">
      <Head />
      <Preview>
        Ochtendrapport indexing — {fmt(report.totals.inspections_since)} inspecties, {fmt(report.totals.pushes_since)} indexeringsverzoeken, {deltaLabel(report.totals.indexed_delta)} indexed
      </Preview>
      <Body style={{ backgroundColor: c.background, margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: "640px", margin: "0 auto", padding: "0" }}>
          {/* Header */}
          <Section style={{ backgroundColor: c.headerBg, padding: "20px 24px", borderRadius: "8px 8px 0 0" }}>
            <Row>
              <Column style={{ verticalAlign: "middle" }}>
                <Img
                  src={`${baseUrl}/exit-logo.webp`}
                  width="70"
                  height="52"
                  alt="EXIT Toys"
                  style={{ display: "block", marginBottom: "4px" }}
                />
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: 0 }}>
                  Indexing Dashboard
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: "2px 0 0 0" }}>
                  Google Search Console
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Titel + intro */}
          <Section style={{ backgroundColor: c.card, padding: "24px", borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}` }}>
            <Heading as="h1" style={{ color: c.text, fontSize: "22px", fontWeight: 600, margin: "0 0 4px 0" }}>
              Ochtendrapport — {nlDate}
            </Heading>
            <Text style={{ color: c.muted, fontSize: "14px", margin: "0" }}>
              {scheduleName ? `${scheduleName} · ` : ""}Overzicht van de {report.humanSince}
            </Text>
          </Section>

          {/* Stat cards */}
          <Section style={{ backgroundColor: c.card, padding: "0 24px 16px 24px", borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}` }}>
            <Row>
              <StatCard label="Inspecties" value={fmt(report.totals.inspections_since)} accent={c.primary} />
              <StatCard label="Indexeringsverzoeken" value={fmt(report.totals.pushes_since)} accent={c.primary} />
              <StatCard label="Δ indexed" value={deltaLabel(report.totals.indexed_delta)} accent={deltaColor(report.totals.indexed_delta)} />
            </Row>
            <Row style={{ marginTop: "12px" }}>
              <StatCard label="Totaal URLs" value={fmt(report.totals.total_urls)} accent={c.text} />
              <StatCard label="Geïndexeerd" value={fmt(report.totals.indexed)} accent={c.green} />
              <StatCard label="Coverage" value={`${report.totals.coverage_pct}%`} accent={c.primary} />
            </Row>
          </Section>

          {/* Per shop tabel */}
          <Section style={{ backgroundColor: c.card, padding: "8px 24px 24px 24px", borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}` }}>
            <Heading as="h2" style={{ color: c.text, fontSize: "16px", fontWeight: 600, margin: "16px 0 12px 0" }}>
              Per shop
            </Heading>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}`, color: c.muted }}>
                  <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 500 }}>Shop</th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Inspecties</th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Verzoeken</th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Δ indexed</th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {report.shops.map((s) => {
                  const info = SHOP_INFO[s.shop_id];
                  const cov = s.total_now > 0 ? ((s.indexed_now / s.total_now) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={s.shop_id} style={{ borderBottom: `1px solid ${c.accent50}` }}>
                      <td style={{ padding: "8px 0", color: c.text }}>
                        {info ? `${info.flag} ${info.name}` : s.shop_id}
                      </td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: c.text }}>{fmt(s.inspections_since)}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: c.text }}>{fmt(s.pushes_since)}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: deltaColor(s.indexed_delta), fontWeight: 500 }}>{deltaLabel(s.indexed_delta)}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", color: c.muted }}>{cov}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>

          {/* Top issues */}
          {report.topIssues.length > 0 && (
            <Section style={{ backgroundColor: c.card, padding: "0 24px 24px 24px", borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}` }}>
              <Heading as="h2" style={{ color: c.text, fontSize: "16px", fontWeight: 600, margin: "8px 0 12px 0" }}>
                Top issues (niet-geïndexeerd)
              </Heading>
              {report.topIssues.map((i) => (
                <Row key={i.coverage_state} style={{ borderBottom: `1px solid ${c.accent50}` }}>
                  <Column>
                    <Text style={{ fontSize: "13px", color: c.text, margin: "8px 0" }}>{i.coverage_state}</Text>
                  </Column>
                  <Column align="right">
                    <Text style={{ fontSize: "13px", color: c.red, margin: "8px 0", fontWeight: 500 }}>{fmt(i.count)}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* Recent ingediende URLs */}
          {report.recentPushes.length > 0 && (
            <Section style={{ backgroundColor: c.card, padding: "0 24px 24px 24px", borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}` }}>
              <Heading as="h2" style={{ color: c.text, fontSize: "16px", fontWeight: 600, margin: "8px 0 12px 0" }}>
                Recent ingediende URLs
              </Heading>
              {report.recentPushes.map((u, idx) => (
                <div key={idx} style={{ padding: "6px 0", borderBottom: `1px solid ${c.accent50}` }}>
                  <Text style={{ fontSize: "12px", color: c.text, margin: 0, wordBreak: "break-all" }}>
                    <VerdictBadge verdict={u.verdict} /> {u.url}
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section style={{ backgroundColor: c.accent50, padding: "20px 24px", borderRadius: "0 0 8px 8px", border: `1px solid ${c.border}`, borderTop: "none", textAlign: "center" }}>
            <Text style={{ fontSize: "12px", color: c.muted, margin: 0 }}>
              <Link href={baseUrl} style={{ color: c.primary, textDecoration: "none", fontWeight: 500 }}>
                Open het volledige dashboard →
              </Link>
            </Text>
            <Hr style={{ margin: "12px 0", borderColor: c.border }} />
            <Text style={{ fontSize: "11px", color: c.muted, margin: 0 }}>
              Deze mail wordt automatisch verstuurd door de EXIT Toys Indexing pipeline.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Column style={{ padding: "0 6px" }}>
      <div style={{ backgroundColor: c.accent50, border: `1px solid ${c.border}`, borderRadius: "8px", padding: "12px" }}>
        <Text style={{ fontSize: "11px", color: c.muted, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</Text>
        <Text style={{ fontSize: "20px", color: accent, margin: "4px 0 0 0", fontWeight: 600 }}>{value}</Text>
      </div>
    </Column>
  );
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  const isPass = verdict === "PASS";
  const bg = isPass ? "#DCFCE7" : verdict ? "#FEE2E2" : "#FEF3C7";
  const fg = isPass ? c.green : verdict ? c.red : c.yellow;
  const label = isPass ? "PASS" : verdict ?? "?";
  return (
    <span style={{ backgroundColor: bg, color: fg, fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", marginRight: "6px" }}>
      {label}
    </span>
  );
}

export async function renderReportEmail(input: TemplateProps): Promise<{ html: string; text: string }> {
  const html = await render(<EmailTemplate {...input} />);
  const text = await render(<EmailTemplate {...input} />, { plainText: true });
  return { html, text };
}
