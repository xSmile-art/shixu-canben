export type FontFamily = "serif" | "sans" | "kai";

/** 阅读模式：滚动 or 分页 */
export type PageMode = "scroll" | "paged";

/** 翻页动画样式（仅 pageMode === "paged" 时有效） */
export type FlipStyle = "simulate" | "cover" | "slide" | "vertical" | "none";

export interface ReadingSettings {
  fontFamily: FontFamily;
  fontSize: number; // 14-24 px
  lineHeight: number; // 1.5-2.5
  letterSpacing: number; // 0-4 px
  paragraphSpacing: number; // 0.5-2 em
  paragraphIndent: boolean;
  contentWidth: number; // 600-900 px
  pageMode: PageMode;
  flipStyle: FlipStyle;
  brightness: number; // 0.3-1.0
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: 1.9,
  letterSpacing: 0,
  paragraphSpacing: 1,
  paragraphIndent: true,
  contentWidth: 720,
  pageMode: "scroll",
  flipStyle: "simulate",
  brightness: 1.0,
};
