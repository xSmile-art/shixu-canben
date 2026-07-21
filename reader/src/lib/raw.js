// 仓库坐标——迁移仓库只改这里
const OWNER = 'xSmile-art'
const REPO = 'shixu-canben'
const BRANCH = 'main'
const NOVELS_PREFIX = 'novels/时序残本/正文'

const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`

// 把 { num, title } 还原成仓库里的文件名（与创作命名规则一致）
export function buildFileName({ num, title }) {
  return `第${num}章-${title}.md`
}

// 章节正文 raw URL，中文路径用 encodeURI 编码
export function buildChapterUrl(chapter) {
  const fileName = buildFileName(chapter)
  const path = `${NOVELS_PREFIX}/${fileName}`
  return `${RAW_BASE}/${encodeURI(path)}`
}

// 章节索引 raw URL
export function buildIndexUrl() {
  return `${RAW_BASE}/chapters-index.json`
}
