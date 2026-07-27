/**
 * Minimal GitHub REST API wrapper — deliberately not the octokit SDK to
 * avoid an extra dependency for a handful of calls. Requires GITHUB_PAT
 * (a fine-grained token scoped to this one repo, Contents: read/write +
 * Pull requests: read/write — nothing broader).
 */

const OWNER = "IvanTatarchuk";
const REPO = "Matadora-business";
const API = "https://api.github.com";

function headers() {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error("GITHUB_PAT is not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} ${path}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

export async function getFile(filePath: string, ref = "main"): Promise<{ content: string; sha: string } | null> {
  try {
    const data = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}?ref=${ref}`);
    return { content: Buffer.from(data.content, "base64").toString("utf-8"), sha: data.sha };
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export async function getMainSha(): Promise<string> {
  const data = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/main`);
  return data.object.sha;
}

export async function createBranch(branchName: string, fromSha: string): Promise<void> {
  await gh(`/repos/${OWNER}/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
  });
}

export async function putFile(
  branch: string,
  filePath: string,
  content: string,
  message: string,
  existingSha?: string
): Promise<void> {
  await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
}

export async function openPullRequest(params: {
  branch: string;
  title: string;
  body: string;
}): Promise<{ number: number; html_url: string }> {
  const pr = await gh(`/repos/${OWNER}/${REPO}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title: params.title, head: params.branch, base: "main", body: params.body }),
  });
  await gh(`/repos/${OWNER}/${REPO}/issues/${pr.number}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels: ["agent-generated"] }),
  });
  return { number: pr.number, html_url: pr.html_url };
}
