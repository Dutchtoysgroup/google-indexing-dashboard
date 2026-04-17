export type GithubConfig = {
  token: string;
  repo: string; // "owner/name"
  workflowFile: string; // e.g. "daily-indexing.yml"
  ref: string; // branch/tag
};

function getConfig(): GithubConfig {
  const token = process.env.GITHUB_PAT;
  const repo = process.env.GITHUB_TRIGGER_REPO ?? "svendijk2408/google-indexing-tool";
  const workflowFile = process.env.GITHUB_TRIGGER_WORKFLOW ?? "daily-indexing.yml";
  const ref = process.env.GITHUB_TRIGGER_REF ?? "main";
  if (!token) {
    throw new Error(
      "GITHUB_PAT env var ontbreekt. Voeg een fine-grained personal access token toe met Actions:write op de pipeline-repo."
    );
  }
  return { token, repo, workflowFile, ref };
}

type GithubHeaders = Record<string, string>;

function headers(token: string): GithubHeaders {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "indexing-dashboard",
  };
}

export async function dispatchWorkflow(): Promise<{ ok: true; dispatchedAt: string }> {
  const cfg = getConfig();
  const url = `https://api.github.com/repos/${cfg.repo}/actions/workflows/${cfg.workflowFile}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: cfg.ref }),
    cache: "no-store",
  });
  if (res.status !== 204) {
    const body = await res.text();
    throw new Error(`GitHub dispatch mislukt (${res.status}): ${body.slice(0, 300)}`);
  }
  return { ok: true, dispatchedAt: new Date().toISOString() };
}

export type WorkflowRun = {
  id: number;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | null
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  event: string;
};

export async function getLatestRun(): Promise<WorkflowRun | null> {
  const cfg = getConfig();
  const url = `https://api.github.com/repos/${cfg.repo}/actions/workflows/${cfg.workflowFile}/runs?per_page=1`;
  const res = await fetch(url, {
    headers: headers(cfg.token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub runs-lookup mislukt (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { workflow_runs: WorkflowRun[] };
  return data.workflow_runs[0] ?? null;
}
