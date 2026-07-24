import type { CSSProperties } from "react";
import type { FlipStyle } from "@app-types/settings";

export type FlipDir = "next" | "prev";

/** 一帧翻页：front/back 两层样式 + 容器 stage 样式 + front 层渲染的是否为新页 */
export interface FlipFrame {
  front: CSSProperties;
  back: CSSProperties;
  stage?: CSSProperties;
  frontIsNew: boolean;
}

/** 手势主轴：simulate/cover/slide 跟手水平，vertical 跟手垂直，none 不跟手 */
export function axisOf(style: FlipStyle): "x" | "y" | null {
  switch (style) {
    case "simulate":
    case "cover":
    case "slide":
      return "x";
    case "vertical":
      return "y";
    case "none":
      return null;
  }
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * 给定样式与进度 p∈[0,1]，输出该帧的双层样式（纯函数，便于测试）。
 * 约定：front 在上层；frontIsNew 表示 front 渲染 to 页还是 from 页。
 *
 * 各样式 front/back 页面归属：
 * - cover next：front=新页（盖入），back=旧页
 * - cover prev：front=旧页（滑出），back=新页
 * - slide/vertical：front=新页，back=旧页（首尾相接同向滑动）
 * - simulate next：front=旧页（被翻到背面），back=新页
 * - simulate prev：front=新页（从背面翻回），back=旧页
 */
export function frameFor(style: FlipStyle, p: number, dir: FlipDir): FlipFrame {
  const isNext = dir === "next";
  switch (style) {
    case "none":
      return { front: {}, back: {}, frontIsNew: true };

    case "cover":
      return {
        front: {
          transform: `translateX(${pct(isNext ? 1 - p : p)})`,
          zIndex: 2,
        },
        back: { transform: "translateX(0.000%)", zIndex: 1 },
        frontIsNew: isNext,
      };

    case "slide": {
      // 两层首尾相接同向滑动；next 时旧页向左出
      const sign = isNext ? -1 : 1;
      return {
        back: { transform: `translateX(${pct(sign * p)})`, zIndex: 1 },
        front: {
          transform: `translateX(${pct(-sign * (1 - p))})`,
          zIndex: 2,
        },
        frontIsNew: true,
      };
    }

    case "vertical": {
      // next 时旧页向上出，新页自下而入
      const sign = isNext ? -1 : 1;
      return {
        back: { transform: `translateY(${pct(sign * p)})`, zIndex: 1 },
        front: {
          transform: `translateY(${pct(-sign * (1 - p))})`,
          zIndex: 2,
        },
        frontIsNew: true,
      };
    }

    case "simulate": {
      // 3D 翻书：front 从 rotateY(0) → rotateY(-180)（next）
      const deg = isNext ? -180 * p : -180 + 180 * p;
      return {
        stage: { perspective: "1500px" },
        back: { zIndex: 1 },
        front: {
          transform: `rotateY(${deg.toFixed(2)}deg)`,
          transformOrigin: "left center",
          backfaceVisibility: "hidden",
          zIndex: 2,
        },
        frontIsNew: !isNext,
      };
    }
  }
}
