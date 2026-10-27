import fs from 'node:fs'
import path from 'node:path'

// 2026-10-28：抽帧用的原片以前"只留不删"（benefit：换参数重抽不必重新下载）。
//   但一天 17 轮、每轮 2–3 条深读，一条 10–20 MB → 一个月十几 G ✗
//   主人定：**只保留最近 100 个视频文件**，更旧的自动删掉。
//   图（九宫格 / 字幕条）不删 —— 那些才是真正要回看的东西。
export const KEEP_VIDEOS = 100
const VIDEO_EXT = /\.(mp4|flv|m4v|mkv|webm)$/i

/**
 * 把 dir 下的视频文件按修改时间排序，只留最近 keep 个，其余删除。
 * 永不抛错：清理失败不该让一次 debrief 白跑。
 */
export function pruneVideos(dir, keep = KEEP_VIDEOS) {
  const n = Number(keep)
  const limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : KEEP_VIDEOS
  let names
  try { names = fs.readdirSync(dir) } catch { return { total: 0, kept: 0, removed: 0 } }

  const files = []
  for (const name of names) {
    if (!VIDEO_EXT.test(name)) continue
    const full = path.join(dir, name)
    try {
      const st = fs.statSync(full)
      if (st.isFile()) files.push({ full, at: st.mtimeMs })
    } catch {}
  }
  files.sort((a, b) => b.at - a.at)

  let removed = 0
  for (const f of files.slice(limit)) {
    try { fs.unlinkSync(f.full); removed += 1 } catch {}
  }
  return { total: files.length, kept: Math.min(files.length, limit), removed }
}
