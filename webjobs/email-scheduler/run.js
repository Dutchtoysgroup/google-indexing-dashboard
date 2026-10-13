const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const secret = process.env.CRON_SECRET;
if (!baseUrl || !secret) throw new Error("NEXT_PUBLIC_BASE_URL of CRON_SECRET ontbreekt");
const response = await fetch(new URL("/api/cron/email-scheduler", baseUrl), {
  headers: { Authorization: `Bearer ${secret}` },
});
if (!response.ok) throw new Error(`E-mailplanning gaf HTTP ${response.status}`);
const outcome = await response.json();
const attention = outcome.results.filter(result =>
  result.failed > 0 || result.uncertain > 0 || result.status === "failed");
if (attention.length) {
  throw new Error(`E-mailplanning vereist aandacht (schedules: ${attention.map(result => result.id).join(", ")}); zie email_deliveries`);
}
console.log("E-mailplanning uitgevoerd");
