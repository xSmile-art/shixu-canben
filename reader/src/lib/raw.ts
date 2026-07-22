import type { Chapter } from '@app-types/chapter'

// 仓库坐标——迁移仓库只改这里
const OWNER = 'xSmile-art'
const REPO = 'shixu-canben'
const BRANCH = 'main'
const NOVELS_PREFIX = 'novels/时序残本/正文'

const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`

export function buildFileName({ num, title }: Chapter): string {
  return `第${num}章-${title}.md`
}

export function buildChapterUrl(chapter: Chapter): string {
  const segs = [...NOVELS_PREFIX.split('/'), buildFileName(chapter)]
  return `${RAW_BASE}/${segs.map(encodeURIComponent).join('/')}`
}

export function buildIndexUrl(): string {
  return `${RAW_BASE}/chapters-index.json`
}
