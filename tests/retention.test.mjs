import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pruneVideos } from '../tools/lib/retention.mjs'

test('只保留最近 N 个视频，图片一张不碰；目录不存在也不抛错', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retention-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))

  // 5 个视频，mtime 递增（v4 最新）
  for (let i = 0; i < 5; i += 1) {
    const p = path.join(dir, `v${i}.mp4`)
    fs.writeFileSync(p, 'x')
    fs.utimesSync(p, new Date(2026, 0, 1 + i), new Date(2026, 0, 1 + i))
  }
  // 图不该被删
  fs.writeFileSync(path.join(dir, 'sheet.jpg'), 'x')
  fs.writeFileSync(path.join(dir, 'subs.png'), 'x')

  const r = pruneVideos(dir, 2)
  assert.equal(r.total, 5)
  assert.equal(r.kept, 2)
  assert.equal(r.removed, 3)
  assert.deepEqual(fs.readdirSync(dir).sort(), ['sheet.jpg', 'subs.png', 'v3.mp4', 'v4.mp4'])

  // 没超过上限就不动
  assert.equal(pruneVideos(dir, 100).removed, 0)
  // 目录不存在：安静返回
  assert.deepEqual(pruneVideos(path.join(dir, 'nope'), 100), { total: 0, kept: 0, removed: 0 })
  // 非法 keep：落回默认，不误删
  assert.equal(pruneVideos(dir, 0).removed, 0)
})
