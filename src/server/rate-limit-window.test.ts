import { describe, expect, it } from "vitest";
import { getRetryAfterSeconds, getWindowStart } from "./rate-limit-window";

const MINUTE_MS = 60 * 1000;
const WINDOW_MS = 10 * MINUTE_MS;

describe("getWindowStart", () => {
  it("窓の幅の倍数に切り捨てる", () => {
    expect(getWindowStart(new Date("2026-11-23T12:07:30.123Z"), WINDOW_MS)).toEqual(
      new Date("2026-11-23T12:00:00.000Z"),
    );
  });

  it("窓の開始時刻ちょうどはその窓に属する", () => {
    expect(getWindowStart(new Date("2026-11-23T12:10:00.000Z"), WINDOW_MS)).toEqual(
      new Date("2026-11-23T12:10:00.000Z"),
    );
  });

  it("窓の終わりの直前は同じ窓に属する", () => {
    expect(getWindowStart(new Date("2026-11-23T12:09:59.999Z"), WINDOW_MS)).toEqual(
      new Date("2026-11-23T12:00:00.000Z"),
    );
  });
});

describe("getRetryAfterSeconds", () => {
  it("次の窓が始まるまでの秒数を返す", () => {
    expect(getRetryAfterSeconds(new Date("2026-11-23T12:07:30.000Z"), WINDOW_MS)).toBe(150);
  });

  it("端数の秒は切り上げる", () => {
    expect(getRetryAfterSeconds(new Date("2026-11-23T12:09:58.500Z"), WINDOW_MS)).toBe(2);
  });

  it("窓の終わりの直前でも最低1秒", () => {
    expect(getRetryAfterSeconds(new Date("2026-11-23T12:09:59.999Z"), WINDOW_MS)).toBe(1);
  });

  it("窓の開始時刻ちょうどなら窓の幅いっぱい", () => {
    expect(getRetryAfterSeconds(new Date("2026-11-23T12:10:00.000Z"), WINDOW_MS)).toBe(600);
  });
});
