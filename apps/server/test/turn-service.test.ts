import { afterEach, describe, expect, it, vi } from "vitest";
import { issueIceServers } from "../src/turn-service.ts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("TURN ICE configuration", () => {
  it("fetches a pre-provisioned credential without creating one per session", async () => {
    vi.stubEnv("METERED_DOMAIN", "rw-test.metered.live");
    vi.stubEnv("METERED_TURN_API_KEY", "credential-scoped-api-key");
    vi.stubEnv("METERED_SECRET_KEY", "");
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/turn/credentials");
      expect(url.searchParams.get("apiKey")).toBe("credential-scoped-api-key");
      return new Response(JSON.stringify([
        { urls: "stun:stun.relay.metered.ca:80" },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "temporary-turn-username",
          credential: "temporary-turn-password"
        }
      ]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const servers = await issueIceServers();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined();
    expect(servers).toHaveLength(2);
    expect(servers.some((server) => [server.urls].flat().some((url) => url.startsWith("turn:")))).toBe(true);
    expect(JSON.stringify(servers)).not.toContain("credential-scoped-api-key");
  });
});
