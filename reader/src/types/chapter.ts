export interface Chapter {
  num: number;
  title: string;
}

export type ChapterIndex = Chapter[];

export type LoadStatus = "loading" | "success" | "error";
