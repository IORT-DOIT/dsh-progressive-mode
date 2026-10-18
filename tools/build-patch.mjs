#!/usr/bin/env node
/**
 * build-patch.mjs — 由 `injected-prompt.md` 重建 patch 里的 persona suffix 块。
 *
 * 渐进模式的常驻规程以 `injected-prompt.md` 为唯一真源：本脚本把它写进指定 patch 的
 * `preset-arch-orchestrator` → `persona.suffix`，其余字节一律不碰。改动冻结件会改变版本
 * （见 docs/RELEASE-v1.2.1.md §治理规则 第 3 条），所以默认只写到 build/ 下供比对。
 *
 * 用法：
 *   node tools/build-patch.mjs [--patch <path>] [--out <path>]
 *     --patch  源 patch，默认 <DSH_HOME>/profiles/desktop/cordis.patch.yml
 *     --out    输出路径，默认 build/cordis.patch.yml；传 --in-place 时写回源文件并留 .bak
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { defaultDshHome } from './verify.mjs'

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log('用法: node tools/build-patch.mjs [--patch <path>] [--out <path>] [--in-place] [--dsh-home <dir>]')
  process.exit(0)
}

const dshHome = args.dshHome || defaultDshHome()
const patchPath = resolve(args.patch || join(dshHome, 'profiles', 'desktop', 'cordis.patch.yml'))
const outPath = args.inPlace ? patchPath : resolve(args.out || join(process.cwd(), 'build', 'cordis.patch.yml'))
const promptPath = join(import.meta.dirname, '..', 'injected-prompt.md')

const prompt = readFileSync(promptPath, 'utf8')
const live = readFileSync(patchPath, 'utf8')

if (prompt.includes('{{')) throw new Error('prompt contains a {{ template group')
if (prompt.includes('\t')) throw new Error('prompt contains a tab')
if (prompt.includes('\r')) throw new Error('prompt contains CR')
for (const line of prompt.split('\n')) {
  if (/\s+$/.test(line)) throw new Error(`prompt has trailing whitespace: ${JSON.stringify(line)}`)
}

const lines = live.split('\n')
const start = lines.findIndex((line) => line === '              suffix: |')
if (start < 0) throw new Error('persona suffix block not found')
let end = start + 1
while (end < lines.length && (lines[end] === '' || lines[end].startsWith('                '))) end += 1

const promptLines = prompt.split('\n')
if (promptLines[promptLines.length - 1] === '') promptLines.pop()
const block = [
  '              suffix: |',
  '                Your working directory is {{cwd}}.',
  '',
  ...promptLines.map((line) => (line === '' ? '' : `                ${line}`)),
]
const out = [...lines.slice(0, start), ...block, ...lines.slice(end)].join('\n')

for (const stale of [
  '## T0：直接执行',
  '## T1：固定编排',
  '## T2：并行编排',
  '## T3：动态编排',
  'P2/P3 的核心要求',
  'L0–L5',
  'T/P/L',
]) {
  if (out.includes(stale)) throw new Error(`superseded text still present: ${JSON.stringify(stale)}`)
}
for (const fresh of [
  '# 渐进模式 v1.2.1',
  '根据任务实际影响范围，逐步增加分析、设计、编排和验证深度。',
  '默认采用最低必要复杂度。',
  '不要为了流程而流程。',
]) {
  if (!out.includes(fresh)) throw new Error(`v1.2.1 content missing: ${fresh}`)
}
if (!out.endsWith('\n')) throw new Error('generated patch lost its trailing newline')

if (!args.inPlace) mkdirSync(dirname(outPath), { recursive: true })
else {
  copyFileSync(patchPath, `${patchPath}.bak-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`)
}
writeFileSync(outPath, out)
console.log(JSON.stringify({ source: patchPath, out: outPath, patchChars: out.length, promptChars: prompt.length }, null, 2))
if (args.inPlace && existsSync(outPath)) {
  console.log('已写回。请重跑 `node tools/verify.mjs --patch <path>` 校验。')
}

function parseArgs(argv) {
  const out = { patch: null, out: null, inPlace: false, dshHome: null, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--patch') out.patch = argv[++i]
    else if (arg === '--out') out.out = argv[++i]
    else if (arg === '--in-place') out.inPlace = true
    else if (arg === '--dsh-home') out.dshHome = argv[++i]
    else if (arg === '--help' || arg === '-h') out.help = true
    else {
      console.error(`未知参数: ${arg}`)
      process.exit(2)
    }
  }
  return out
}
