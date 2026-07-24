import { describe, it, expect } from "vitest";
import { zoneOf, type TapZone } from "@lib/tapZone";

describe("zoneOf 三段点按分区", () => {
  it("左 1/3 是 prev", () => {
    expect(zoneOf(0)).toBe("prev");
    expect(zoneOf(0.2)).toBe("prev");
    expect(zoneOf(1 / 3 - 0.001)).toBe("prev");
  });
  it("中 1/3 是 menu", () => {
    expect(zoneOf(1 / 3)).toBe("menu");
    expect(zoneOf(0.5)).toBe("menu");
    expect(zoneOf(2 / 3 - 0.001)).toBe("menu");
  });
  it("右 1/3 是 next", () => {
    expect(zoneOf(2 / 3)).toBe("next");
    expect(zoneOf(0.9)).toBe("next");
    expect(zoneOf(1)).toBe("next");
  });
  it("越界值 clamp", () => {
    expect(zoneOf(-0.5)).toBe("prev");
    expect(zoneOf(1.5)).toBe("next");
  });
  it("类型导出", () => {
    const z: TapZone = "menu";
    expect(z).toBe("menu");
  });
});
