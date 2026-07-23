import type { Theme } from "@app-types/theme";

export const PRESET_THEMES: Theme[] = [
  {
    name: "day",
    label: "日间白",
    colors: {
      bg: "#ffffff",
      fg: "#1a1a1a",
      accent: "#8b5a2b",
      muted: "#666666",
      border: "#e0ddd5",
      highlight: "rgba(139,90,43,0.12)",
    },
  },
  {
    name: "paper",
    label: "羊皮纸",
    colors: {
      bg: "#f5ecd7",
      fg: "#3a2f23",
      accent: "#8b5a2b",
      muted: "#7a6f5d",
      border: "#d8cdb4",
      highlight: "rgba(139,90,43,0.14)",
    },
  },
  {
    name: "green",
    label: "护眼绿",
    colors: {
      bg: "#e6f2e6",
      fg: "#1f2d1f",
      accent: "#2f6b2f",
      muted: "#5a6b5a",
      border: "#c2d8c2",
      highlight: "rgba(47,107,47,0.12)",
    },
  },
  {
    name: "douban",
    label: "豆沙绿",
    colors: {
      bg: "#c7d6c5",
      fg: "#1c261c",
      accent: "#3a6b3a",
      muted: "#4c5c4c",
      border: "#a8bda6",
      highlight: "rgba(58,107,58,0.14)",
    },
  },
  {
    name: "sakura",
    label: "樱花粉",
    colors: {
      bg: "#fbeef0",
      fg: "#2d1f24",
      accent: "#b0536b",
      muted: "#7a5f68",
      border: "#e4ccd3",
      highlight: "rgba(176,83,107,0.12)",
    },
  },
  {
    name: "sky",
    label: "天空蓝",
    colors: {
      bg: "#e8f1f8",
      fg: "#1c2733",
      accent: "#2b6a9e",
      muted: "#5a6b7a",
      border: "#c4d6e4",
      highlight: "rgba(43,106,158,0.12)",
    },
  },
  {
    name: "night",
    label: "夜间黑",
    colors: {
      bg: "#0f0f0f",
      fg: "#d6d6d6",
      accent: "#c9a86a",
      muted: "#8a8a8a",
      border: "#2c2c2c",
      highlight: "rgba(201,168,106,0.16)",
    },
  },
  {
    name: "deepnight",
    label: "深蓝夜",
    colors: {
      bg: "#0d1b2a",
      fg: "#cfd8e3",
      accent: "#7aa2c9",
      muted: "#7a8a9c",
      border: "#22354a",
      highlight: "rgba(122,162,201,0.16)",
    },
  },
];
