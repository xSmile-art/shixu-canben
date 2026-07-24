import { describe, it, expect } from "vitest";
import { axisOf, frameFor, type FlipDir } from "@lib/flipStyle";

describe("axisOf", () => {
  it("simulate/cover/slide 是水平，vertical 是垂直，none 无跟手", () => {
    expect(axisOf("simulate")).toBe("x");
    expect(axisOf("cover")).toBe("x");
    expect(axisOf("slide")).toBe("x");
    expect(axisOf("vertical")).toBe("y");
    expect(axisOf("none")).toBeNull();
  });
});

describe("frameFor", () => {
  const dir: FlipDir = "next";

  it("slide：p=0 新页在屏外右侧，p=1 旧页在屏外左侧", () => {
    const f0 = frameFor("slide", 0, dir);
    expect(f0.front.transform).toBe("translateX(100.000%)");
    expect(f0.back.transform).toBe("translateX(0.000%)");
    const f1 = frameFor("slide", 1, dir);
    expect(f1.back.transform).toBe("translateX(-100.000%)");
    expect(f1.front.transform).toBe("translateX(0.000%)");
  });

  it("cover next：新页盖入；prev：旧页滑出", () => {
    const fNext = frameFor("cover", 0.5, "next");
    expect(fNext.frontIsNew).toBe(true);
    expect(fNext.front.transform).toBe("translateX(50.000%)");
    const fPrev = frameFor("cover", 0.5, "prev");
    expect(fPrev.frontIsNew).toBe(false);
    expect(fPrev.front.transform).toBe("translateX(50.000%)");
  });

  it("vertical next：旧页上滑新页自下而入", () => {
    const f = frameFor("vertical", 0.5, "next");
    expect(f.back.transform).toBe("translateY(-50.000%)");
    expect(f.front.transform).toBe("translateY(50.000%)");
  });

  it("simulate：front rotateY 随 p 从 0 到 -180", () => {
    const f0 = frameFor("simulate", 0, "next");
    expect(f0.front.transform).toBe("rotateY(0.00deg)");
    expect(f0.stage?.perspective).toBe("1500px");
    const f1 = frameFor("simulate", 1, "next");
    expect(f1.front.transform).toBe("rotateY(-180.00deg)");
  });

  it("none：不做双层帧（front/back 均无 transform）", () => {
    const f = frameFor("none", 0.5, "next");
    expect(f.front.transform).toBeUndefined();
    expect(f.back.transform).toBeUndefined();
  });
});
