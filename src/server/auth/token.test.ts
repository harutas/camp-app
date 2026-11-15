import { describe, expect, it } from "vitest";
import { generateSessionToken, hashSessionToken } from "./token";

describe("generateSessionToken", () => {
  it("32バイトを base64url にした43文字を返す", () => {
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("呼ぶたびに異なる値を返す", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});

describe("hashSessionToken", () => {
  it("SHA-256 の16進数表現を返す", () => {
    // "abc" の SHA-256（FIPS 180-2 のテストベクタ）
    expect(hashSessionToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("同じトークンからは常に同じハッシュを返す（DB の検索に使えるように）", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("元のトークンとは異なる値になる", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
