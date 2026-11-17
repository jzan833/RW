import { randomUUID } from "node:crypto";

// Provider secrets stay on the server; never include request URLs or responses in errors.
type IceServer = { urls: string | string[]; username?: string; credential?: string };

export async function issueIceServers(): Promise<IceServer[]> {
  const clean = (value: string | undefined) => (value ?? "").trim().replace(/^<(.*)>$/, "$1").trim();
  const domain = clean(process.env.METERED_DOMAIN);
  const secret = clean(process.env.METERED_SECRET_KEY);
  if (!domain || !secret || !/^[a-z0-9-]+\.metered\.live$/i.test(domain)) {
    throw new Error("TURN configuration unavailable");
  }
  const base = `https://${domain}`;
  const credentialUrl = new URL("/api/v1/turn/credential", base);
  credentialUrl.searchParams.set("secretKey", secret);
  const credential = await providerFetch(credentialUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiryInSeconds: 3600, label: `rw-${randomUUID()}` })
  }) as Record<string, unknown>;
  if (typeof credential.apiKey !== "string" || Number(credential.expiryInSeconds) !== 3600) {
    throw new Error("TURN credential shape unavailable");
  }
  const iceUrl = new URL("/api/v1/turn/credentials", base);
  iceUrl.searchParams.set("apiKey", credential.apiKey);
  const servers = await providerFetch(iceUrl);
  if (!Array.isArray(servers) || !servers.length || !servers.every(validIceServer)) {
    throw new Error("TURN ICE shape unavailable");
  }
  if (!servers.some((server) => [server.urls].flat().some((url) => typeof url === "string" && /^turns?:/.test(url)))) {
    throw new Error("TURN relay unavailable");
  }
  return servers;
}

function validIceServer(value: unknown): value is IceServer {
  if (!value || typeof value !== "object") return false;
  const server = value as Record<string, unknown>;
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  return urls.length > 0 && urls.every((url) => typeof url === "string" && /^(stun|turn|turns):/.test(url)) &&
    (urls.every((url) => !url.startsWith("turn")) ||
      (typeof server.username === "string" && typeof server.credential === "string"));
}

async function providerFetch(url: URL, init?: RequestInit): Promise<unknown> {
  try {
    const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    throw new Error("TURN unavailable");
  }
}
