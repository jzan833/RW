import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const INVITE_TTL_MS = 5 * 60 * 1_000;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1_000;

type InviteRecord = {
  id: string;
  pinVerifier: Buffer;
  expiresAt: number;
  failedAttempts: number;
  consumed: boolean;
};

type MonitoringSessionRecord = {
  id: string;
  cameraTokenVerifier: Buffer;
  createdAt: number;
  expiresAt: number;
  invite: InviteRecord;
};

export type PublicInvite = {
  inviteId: string;
  pin: string;
  expiresAt: string;
};

export type CreatedMonitoringSession = {
  sessionId: string;
  cameraToken: string;
  expiresAt: string;
  invite: PublicInvite;
};

export type PairingResult = {
  sessionId: string;
};

type MonitoringSessionStoreOptions = {
  secret: string | Uint8Array;
  now?: () => number;
};

export class MonitoringSessionStore {
  readonly #secret: string | Uint8Array;
  readonly #now: () => number;
  readonly #sessions = new Map<string, MonitoringSessionRecord>();
  readonly #inviteSessions = new Map<string, string>();

  constructor({ secret, now = Date.now }: MonitoringSessionStoreOptions) {
    this.#secret = secret;
    this.#now = now;
  }

  create(): CreatedMonitoringSession {
    this.#removeExpiredSessions();
    const sessionId = randomBytes(32).toString("base64url");
    const cameraToken = randomBytes(32).toString("base64url");
    const createdAt = this.#now();
    const generatedInvite = this.#createInvite(sessionId, createdAt);

    this.#sessions.set(sessionId, {
      id: sessionId,
      cameraTokenVerifier: this.#verifier("camera", sessionId, cameraToken),
      createdAt,
      expiresAt: createdAt + SESSION_TTL_MS,
      invite: generatedInvite.record
    });
    this.#inviteSessions.set(generatedInvite.record.id, sessionId);

    return {
      sessionId,
      cameraToken,
      expiresAt: new Date(createdAt + SESSION_TTL_MS).toISOString(),
      invite: generatedInvite.publicInvite
    };
  }

  regenerateInvite(sessionId: string, cameraToken: string): PublicInvite | undefined {
    const session = this.#authorizedSession(sessionId, cameraToken);
    if (!session) return undefined;

    const generatedInvite = this.#createInvite(session.id, this.#now());
    this.#inviteSessions.delete(session.invite.id);
    session.invite = generatedInvite.record;
    this.#inviteSessions.set(generatedInvite.record.id, session.id);
    return generatedInvite.publicInvite;
  }

  pair(inviteId: string, pin: string): PairingResult | undefined {
    this.#removeExpiredSessions();
    const sessionId = this.#inviteSessions.get(inviteId);
    if (!sessionId) return undefined;
    const session = this.#sessions.get(sessionId);
    if (!session || session.invite.id !== inviteId) {
      this.#inviteSessions.delete(inviteId);
      return undefined;
    }

    const invite = session.invite;
    if (invite.consumed || invite.expiresAt <= this.#now()) {
      this.#inviteSessions.delete(inviteId);
      return undefined;
    }

    const candidate = this.#verifier("pin", sessionId, inviteId, pin);
    if (
      candidate.length !== invite.pinVerifier.length ||
      !timingSafeEqual(candidate, invite.pinVerifier)
    ) {
      invite.failedAttempts += 1;
      return undefined;
    }

    invite.consumed = true;
    this.#inviteSessions.delete(inviteId);
    return { sessionId };
  }

  stop(sessionId: string, cameraToken: string): boolean {
    const session = this.#authorizedSession(sessionId, cameraToken);
    if (!session) return false;
    return this.#deleteSession(session.id);
  }

  #authorizedSession(sessionId: string, cameraToken: string): MonitoringSessionRecord | undefined {
    const session = this.#sessions.get(sessionId);
    if (!session) return undefined;

    if (session.expiresAt <= this.#now()) {
      this.#deleteSession(sessionId);
      return undefined;
    }

    const candidate = this.#verifier("camera", sessionId, cameraToken);
    if (
      candidate.length !== session.cameraTokenVerifier.length ||
      !timingSafeEqual(candidate, session.cameraTokenVerifier)
    ) {
      return undefined;
    }

    return session;
  }

  #createInvite(sessionId: string, issuedAt: number) {
    const inviteId = randomBytes(32).toString("base64url");
    const pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = issuedAt + INVITE_TTL_MS;

    return {
      record: {
        id: inviteId,
        pinVerifier: this.#verifier("pin", sessionId, inviteId, pin),
        expiresAt,
        failedAttempts: 0,
        consumed: false
      },
      publicInvite: {
        inviteId,
        pin,
        expiresAt: new Date(expiresAt).toISOString()
      }
    };
  }

  #verifier(purpose: string, ...parts: string[]) {
    const hmac = createHmac("sha256", this.#secret);
    hmac.update(purpose);
    for (const part of parts) {
      hmac.update("\0");
      hmac.update(part);
    }
    return hmac.digest();
  }

  #removeExpiredSessions() {
    const now = this.#now();
    for (const [sessionId, session] of this.#sessions) {
      if (session.expiresAt <= now) this.#deleteSession(sessionId);
    }
  }

  #deleteSession(sessionId: string) {
    const session = this.#sessions.get(sessionId);
    if (!session) return false;
    this.#inviteSessions.delete(session.invite.id);
    return this.#sessions.delete(sessionId);
  }
}
