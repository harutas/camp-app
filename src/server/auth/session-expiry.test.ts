import { describe, expect, it } from "vitest";
import {
  calculateExpiresAt,
  getSessionStatus,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TTL_MS,
  SESSION_TOUCH_INTERVAL_MS,
  shouldTouchSession,
} from "./session-expiry";

const now = new Date("2026-11-15T00:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const later = (ms: number) => new Date(now.getTime() + ms);

describe("calculateExpiresAt", () => {
  it("作成時刻から30日後を返す", () => {
    expect(calculateExpiresAt(now)).toEqual(later(SESSION_ABSOLUTE_TTL_MS));
  });
});

describe("getSessionStatus", () => {
  it("期限内で最近アクセスがあれば valid", () => {
    expect(getSessionStatus({ expiresAt: later(1000), lastSeenAt: now }, now)).toBe("valid");
  });

  it("絶対期限ちょうどで expired", () => {
    expect(getSessionStatus({ expiresAt: now, lastSeenAt: now }, now)).toBe("expired");
  });

  it("絶対期限を過ぎていれば、最近アクセスがあっても expired", () => {
    expect(getSessionStatus({ expiresAt: ago(1), lastSeenAt: now }, now)).toBe("expired");
  });

  it("最後のアクセスからちょうど7日で idle", () => {
    expect(
      getSessionStatus({ expiresAt: later(1000), lastSeenAt: ago(SESSION_IDLE_TTL_MS) }, now),
    ).toBe("idle");
  });

  it("最後のアクセスから7日未満なら valid", () => {
    expect(
      getSessionStatus({ expiresAt: later(1000), lastSeenAt: ago(SESSION_IDLE_TTL_MS - 1) }, now),
    ).toBe("valid");
  });

  it("両方の期限を過ぎていれば expired を優先する", () => {
    expect(getSessionStatus({ expiresAt: ago(1), lastSeenAt: ago(SESSION_IDLE_TTL_MS) }, now)).toBe(
      "expired",
    );
  });
});

describe("shouldTouchSession", () => {
  const expiresAt = later(SESSION_ABSOLUTE_TTL_MS);

  it("前回の更新から1時間未満なら更新しない", () => {
    expect(
      shouldTouchSession({ expiresAt, lastSeenAt: ago(SESSION_TOUCH_INTERVAL_MS - 1) }, now),
    ).toBe(false);
  });

  it("前回の更新からちょうど1時間で更新する", () => {
    expect(shouldTouchSession({ expiresAt, lastSeenAt: ago(SESSION_TOUCH_INTERVAL_MS) }, now)).toBe(
      true,
    );
  });
});
