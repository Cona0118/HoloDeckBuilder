import { describe, expect, it } from "vitest";
import { toImagePath, toImageSrcWith } from "./imageCdn";

const BASE = "https://img.example.com";

describe("toImageSrcWith", () => {
  it("베이스가 비어 있으면 원본 경로를 그대로 반환한다", () => {
    expect(toImageSrcWith("", "/images/hBP01/hBP01-001_OSR.png")).toBe(
      "/images/hBP01/hBP01-001_OSR.png",
    );
  });

  it("베이스가 있으면 CDN URL + .webp 로 변환한다", () => {
    expect(toImageSrcWith(BASE, "/images/hBP01/hBP01-001_OSR.png")).toBe(
      `${BASE}/images/hBP01/hBP01-001_OSR.webp`,
    );
  });

  it("/images/ 로 시작하지 않는 URL(로고·외부 URL)은 건드리지 않는다", () => {
    expect(toImageSrcWith(BASE, "/logo.png")).toBe("/logo.png");
    expect(toImageSrcWith(BASE, "https://other.com/a.png")).toBe("https://other.com/a.png");
  });
});

describe("toImagePath", () => {
  it("로컬 경로는 그대로 유지한다", () => {
    expect(toImagePath("/images/hY/hY01.png")).toBe("/images/hY/hY01.png");
  });

  it("CDN URL(.webp)을 로컬 경로 공간(.png)으로 정규화한다", () => {
    expect(toImagePath(`${BASE}/images/SY/hY01-002_P.webp`)).toBe("/images/SY/hY01-002_P.png");
  });

  it("과거에 저장된 다른 도메인의 CDN URL도 경로 공간으로 정규화한다", () => {
    expect(toImagePath("https://old-cdn.example.net/images/hBP02/hBP02-014_C.webp")).toBe(
      "/images/hBP02/hBP02-014_C.png",
    );
  });

  it("변환 왕복이 일치한다 (저장된 변형 URL 매칭 보장)", () => {
    const src = toImageSrcWith(BASE, "/images/hEB01/hEB01-001_OSR.png");
    expect(toImagePath(src)).toBe("/images/hEB01/hEB01-001_OSR.png");
  });
});
