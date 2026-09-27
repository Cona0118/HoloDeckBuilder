import { describe, expect, it } from "vitest";
import { isValidImageBase, normalizeImageBase } from "./imageBase";

const BASE = "https://pub-abc.r2.dev";

describe("normalizeImageBase", () => {
  it("앞에 붙은 BOM(U+FEFF)을 제거한다 — PowerShell 파이프로 env 등록 시 실제 발생", () => {
    expect(normalizeImageBase(`\uFEFF${BASE}`)).toBe(BASE);
  });

  it("제로폭 문자·공백·줄바꿈·끝 슬래시를 제거한다", () => {
    expect(normalizeImageBase(`  \u200B${BASE}/\r\n`)).toBe(BASE);
    expect(normalizeImageBase(`${BASE}///`)).toBe(BASE);
  });

  it("미설정·빈 값은 빈 문자열", () => {
    expect(normalizeImageBase(undefined)).toBe("");
    expect(normalizeImageBase("\uFEFF  ")).toBe("");
  });
});

describe("isValidImageBase", () => {
  it("http(s) 절대 URL만 허용한다", () => {
    expect(isValidImageBase(BASE)).toBe(true);
    expect(isValidImageBase("http://localhost:9000")).toBe(true);
    expect(isValidImageBase(`\uFEFF${BASE}`)).toBe(false);
    expect(isValidImageBase("pub-abc.r2.dev")).toBe(false);
    expect(isValidImageBase(`${BASE} junk`)).toBe(false);
    expect(isValidImageBase("ftp://pub-abc.r2.dev")).toBe(false);
    expect(isValidImageBase("")).toBe(false);
  });
});
