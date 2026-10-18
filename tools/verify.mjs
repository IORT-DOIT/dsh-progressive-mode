#!/usr/bin/env node
/**
 * verify.mjs — 渐进模式（Progressive Mode）校验器
 *
 * 用法：
 *   node tools/verify.mjs                        # 校验仓库内 6 个冻结件（SHA256 + 字节数）
 *   node tools/verify.mjs --patch <path>         # 校验某个 profile 的 cordis.patch.yml（16 项装配断言）
 *   node tools/verify.mjs --all [--dsh-home <dir>] [--profile desktop]
 *                                               # 冻结件 + 默认 live patch 一起校验
 *
 * 退出码：0 = 全部通过；1 = 有检查失败；2 = 参数/文件错误。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO = resolve(HERE, '..')

/** 冻结件基线（v1.2.1，2026-09-26 起）。任何一项变化都意味着版本必须递增。 */
export const FROZEN = [
  { file: 'injected-prompt.md', bytes: 1308, sha: '66aaed34b214' },
  { file: 'preset/cordis.patch.yml', bytes: 11492, sha: '0863bd9276a6' },
  { file: 'skills/implementation-depth-analysis/SKILL.md', bytes: 1293, sha: 'e545c29ccc31' },
  { file: 'skills/implementation-planning/SKILL.md', bytes: 613, sha: 'e9cd9c14c5d1' },
  { file: 'skills/orchestration-and-verification/SKILL.md', bytes: 2569, sha: 'c64f33ab9f9b' },
  { file: 'skills/progressive-orchestration/SKILL.md', bytes: 1644, sha: '4bf69e60eac5' },
]

export const SKILL_NAMES = [
  'implementation-depth-analysis',
  'implementation-planning',
  'orchestration-and-verification',
  'progressive-orchestration',
]

const PROMPT = readFileSync(join(REPO, 'injected-prompt.md'))
const EXPECTED_SUFFIX = 'Your working directory is {{cwd}}.\n\n' + PROMPT.toString('utf8')

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

export function defaultDshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** 校验仓库内冻结件。 */
export function checkFrozen() {
  const checks = []
  for (const item of FROZEN) {
    const path = join(REPO, item.file)
    if (!existsSync(path)) {
      checks.push({ name: `frozen ${item.file}`, ok: false, detail: 'missing' })
      continue
    }
    const data = readFileSync(path)
    const hash = sha256(data)
    checks.push({
      name: `frozen ${item.file}`,
      ok: data.length === item.bytes && hash.startsWith(item.sha),
      detail: `${data.length} B, ${hash.slice(0, 12)}`,
    })
  }
  return checks
}

/**
 * 定位 js-yaml：优先仓库本地依赖，其次从已安装 DSH 的 profile node_modules 解析。
 * 这样用户即使没在本仓库跑 npm install，只要机器上装了 DSH 就能校验。
 */
export function loadYaml(dshHome = defaultDshHome()) {
  const probe = (pkgJson) => {
    try {
      const mod = createRequire(pkgJson)('js-yaml')
      return mod && typeof mod.load === 'function' ? mod : null
    } catch {
      return null
    }
  }

  const localPkg = join(REPO, 'package.json')
  if (existsSync(localPkg)) {
    const yaml = probe(localPkg)
    if (yaml) return yaml
  }

  // 目标 home 里没有依赖时，退回到本机默认 DSH home 的 profile node_modules。
  const homes = [...new Set([dshHome, defaultDshHome()].map((home) => resolve(home)))]
  for (const home of homes) {
    const profiles = join(home, 'profiles')
    if (!existsSync(profiles)) continue
    for (const name of readdirSync(profiles)) {
      const pkg = join(profiles, name, 'package.json')
      if (!existsSync(pkg)) continue
      const yaml = probe(pkg)
      if (yaml) return yaml
    }
  }

  throw new Error(
    '找不到 js-yaml。请在本仓库运行 `npm install`，' +
      '或确认 DeepSeek Harness 已安装（其 profile 的 node_modules 内含 js-yaml），' +
      '或用 --dsh-home 指向正确的 DSH_HOME。',
  )
}

function flatten(rows, out = []) {
  for (const row of rows || []) {
    out.push(row)
    if (Array.isArray(row?.config)) flatten(row.config, out)
  }
  return out
}

/** 在 patch（顶层数组）或 --dump-config 组合树里找到 preset-arch-orchestrator 声明。 */
export function findPresetEntry(doc) {
  for (const item of doc) {
    if (item && Array.isArray(item.insert)) {
      const hit = item.insert.find((row) => row && row.id === 'preset-arch-orchestrator')
      if (hit) return hit
    } else if (item && item.id === 'preset-arch-orchestrator') {
      return item
    }
  }
  return null
}

/** 校验已装配的 patch：16 项（结构不变量 + suffix 逐字节 + v1.2.1 断言）。 */
export function verifyPatch({ patchPath, dshHome = defaultDshHome() }) {
  const yaml = loadYaml(dshHome)
  const jsType = new yaml.Type('tag:yaml.org,2002:js', {
    kind: 'scalar',
    construct: (data) => ({ __jsExpr: data }),
  })
  const schema = yaml.DEFAULT_SCHEMA.extend([jsType])

  const doc = yaml.load(readFileSync(patchPath, 'utf8'), { schema })
  if (!Array.isArray(doc)) throw new Error(`${patchPath} 不是 YAML 顶层数组`)

  const entry = findPresetEntry(doc)
  if (!entry) throw new Error(`未找到 preset-arch-orchestrator 声明：${patchPath}`)

  const rows = flatten(entry.config?.plugins)
  const byId = new Map(rows.map((row) => [row.id, row]))
  const suffix = byId.get('persona')?.config?.suffix

  const checks = []
  const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail })

  check(
    'preset id/name/order unchanged',
    entry.config?.id === 'arch-orchestrator' && entry.config?.name === '渐进模式' && entry.config?.order === 5,
  )
  check(
    'persona prefix unchanged',
    byId.get('persona')?.config?.prefix === 'You are a coding agent powered by the {{model}} model.',
  )
  check('suffix == cwd line + injected prompt, byte for byte', suffix === EXPECTED_SUFFIX,
    suffix === undefined ? 'suffix missing' : `got ${suffix.length} / expected ${EXPECTED_SUFFIX.length}`)
  check('only {{cwd}} template group', (suffix?.match(/\{\{/g) || []).length === 1)
  check('prompt is v1.2.1', suffix?.includes('# 渐进模式 v1.2.1'))
  check('core goal line', suffix?.includes('根据任务实际影响范围，逐步增加分析、设计、编排和验证深度。'))
  check(
    'depth ⊥ agent-count principle',
    suffix?.includes('实现深度与 Agent') && suffix?.includes('数量完全独立。'),
  )
  check(
    'routing to the three v1.2.1 skills',
    suffix?.includes('implementation-depth-analysis：判断需要的工程深度') &&
      suffix?.includes('implementation-planning：生成与深度匹配的计划和设计') &&
      suffix?.includes('orchestration-and-verification：编排、验证、失败恢复'),
  )
  check(
    'closing line kept',
    suffix?.includes('不要为了流程而流程。') && suffix?.includes('最终目标是可靠完成用户目标。'),
  )
  check(
    'superseded axes gone',
    !suffix?.includes('T0：直接执行') &&
      !suffix?.includes('P2/P3 的核心要求') &&
      !suffix?.includes('L0–L5') &&
      !suffix?.includes('T/P/L'),
  )
  check(
    'level details stay in the skill, not the prompt',
    !suffix?.includes('Level 0：单点修改') && !suffix?.includes('单点修改。 定位、修改、最小验证。'),
  )
  check('total preset rows', rows.length === 32, `count=${rows.length}`)
  check('ralph stays disabled', byId.get('tool-ralph')?.disabled === true)
  check('plan mode section kept', String(byId.get('plan-mode')?.config?.section).startsWith('You are in plan mode.'))
  check('pruner threshold kept', byId.get('tool-result-pruner')?.config?.thresholdChars === 8192)
  check('bash platform expr kept', typeof byId.get('tool-bash')?.disabled === 'object')

  return checks
}

function parseArgs(argv) {
  const out = { frozen: false, all: false, patch: null, dshHome: defaultDshHome(), profile: 'desktop' }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--frozen') out.frozen = true
    else if (arg === '--all') out.all = true
    else if (arg === '--patch') out.patch = argv[++i]
    else if (arg === '--dsh-home') out.dshHome = argv[++i]
    else if (arg === '--profile') out.profile = argv[++i]
    else if (arg === '--help' || arg === '-h') {
      console.log('用法: node tools/verify.mjs [--frozen] [--patch <path>] [--all] [--dsh-home <dir>] [--profile desktop]')
      process.exit(0)
    } else {
      console.error(`未知参数: ${arg}`)
      process.exit(2)
    }
  }
  return out
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const checks = []
  const wantFrozen = args.frozen || args.all || (!args.patch && !args.all)
  if (wantFrozen) checks.push(...checkFrozen())

  const patchPath = args.patch || (args.all ? join(args.dshHome, 'profiles', args.profile, 'cordis.patch.yml') : null)
  if (patchPath) {
    if (!existsSync(patchPath)) {
      console.error(`patch 不存在: ${patchPath}`)
      process.exit(2)
    }
    checks.push(...verifyPatch({ patchPath, dshHome: args.dshHome }))
    console.log(`# patch: ${patchPath}`)
  }

  let failed = 0
  for (const c of checks) {
    if (!c.ok) failed += 1
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.detail ? '' : `  -> ${c.detail}`}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  process.exit(failed ? 1 : 0)
}

checkMain()
function checkMain() {
  const invoked = process.argv[1] ? resolve(process.argv[1]) : ''
  if (invoked === fileURLToPath(import.meta.url)) main()
}
