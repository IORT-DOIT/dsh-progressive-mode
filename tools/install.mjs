#!/usr/bin/env node
/**
 * install.mjs — 把渐进模式安装进一个 DSH home（默认 `~/.dsh`，可用 --dsh-home 覆盖）。
 *
 * 做三件事：
 *   1. 把 4 个 skill 复制到 <DSH_HOME>/skills/<name>/SKILL.md（内容相同则跳过，内容不同则先备份再覆盖）；
 *   2. 把 preset 声明（preset/progressive.fragment.yml）追加到 <DSH_HOME>/profiles/<profile>/cordis.patch.yml
 *      （已存在 `id: preset-arch-orchestrator` 时跳过；追加前备份原 patch）；
 *   3. 跑一遍 tools/verify.mjs 的 16 项装配校验。
 *
 * 用法：
 *   node tools/install.mjs [--dsh-home <dir>] [--profile desktop] [--dry-run]
 *   node tools/install.mjs --uninstall [--dsh-home <dir>] [--profile desktop] [--dry-run]
 *
 * 退出码：0 = 成功（或 dry-run 可执行）；1 = 校验失败；2 = 参数/环境错误。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { REPO, SKILL_NAMES, verifyPatch, defaultDshHome } from './verify.mjs'

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log(`用法:
  node tools/install.mjs [--dsh-home <dir>] [--profile desktop] [--dry-run]
  node tools/install.mjs --uninstall [--dsh-home <dir>] [--profile desktop] [--dry-run]

默认 DSH home 为 $DSH_HOME 或 ~/.dsh；默认 profile 为 desktop。`)
  process.exit(0)
}

const dshHome = resolve(args.dshHome || defaultDshHome())
const profile = args.profile || 'desktop'
const patchPath = join(dshHome, 'profiles', profile, 'cordis.patch.yml')
const skillsRoot = join(dshHome, 'skills')
const fragment = readFileSync(join(REPO, 'preset', 'progressive.fragment.yml'), 'utf8')
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const log = (msg) => console.log(`${args.dryRun ? '[dry-run] ' : ''}${msg}`)

if (!existsSync(join(REPO, 'injected-prompt.md'))) {
  console.error(`找不到仓库文件: ${join(REPO, 'injected-prompt.md')}`)
  process.exit(2)
}

log(`DSH home : ${dshHome}`)
log(`profile  : ${profile}`)
log(`patch    : ${patchPath}`)
log(`skills   : ${skillsRoot}`)

if (args.uninstall) {
  uninstall()
} else {
  install()
}

function install() {
  if (!existsSync(skillsRoot)) {
    log(`创建 skills 目录: ${skillsRoot}`)
    if (!args.dryRun) mkdirSync(skillsRoot, { recursive: true })
  }

  for (const name of SKILL_NAMES) {
    const source = join(REPO, 'skills', name, 'SKILL.md')
    const targetDir = join(skillsRoot, name)
    const target = join(targetDir, 'SKILL.md')
    if (!args.dryRun) mkdirSync(targetDir, { recursive: true })

    if (existsSync(target) && readFileSync(target).equals(readFileSync(source))) {
      log(`skill 已是最新: ${name}`)
      continue
    }
    if (existsSync(target)) {
      const backup = `${target}.bak-${stamp}`
      log(`skill 已存在且内容不同，备份到 ${backup} 后覆盖: ${name}`)
      if (!args.dryRun) copyFileSync(target, backup)
    } else {
      log(`安装 skill: ${name}`)
    }
    if (!args.dryRun) copyFileSync(source, target)
  }

  const current = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : null
  if (current === null) {
    log(`patch 不存在，创建新文件: ${patchPath}`)
    const header =
      '# Your patch layer for this dsh profile, applied after every bundle layer:\n' +
      '# a top-level YAML array of loader patch entries.\n'
    if (!args.dryRun) {
      mkdirSync(dirname(patchPath), { recursive: true })
      writeFileSync(patchPath, `${header}\n${fragment}`)
    }
  } else if (current.includes('id: preset-arch-orchestrator')) {
    log('preset 声明已存在，跳过追加（如需重装可先 --uninstall）')
  } else {
    const backup = `${patchPath}.bak-${stamp}`
    log(`备份 patch -> ${backup}`)
    if (!args.dryRun) copyFileSync(patchPath, backup)
    const glue = current.endsWith('\n') ? '\n' : '\n\n'
    log('追加 preset 声明')
    if (!args.dryRun) writeFileSync(patchPath, current + glue + fragment)
  }

  if (args.dryRun) {
    log('dry-run 结束，未写入任何文件。')
    process.exit(0)
  }

  console.log('')
  const checks = verifyPatch({ patchPath, dshHome })
  let failed = 0
  for (const c of checks) {
    if (!c.ok) failed += 1
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.detail ? '' : `  -> ${c.detail}`}`)
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
  if (failed) {
    console.error('\n安装后校验未通过。可删除 patch 旁的最新 .bak-* 备份来还原。')
    process.exit(1)
  }
  console.log('\n完成。重启 DeepSeek Harness，在新会话的 preset 选择器里选「渐进模式」。')
}

function uninstall() {
  for (const name of SKILL_NAMES) {
    const dir = join(skillsRoot, name)
    if (!existsSync(dir)) {
      log(`skill 不存在，跳过: ${name}`)
      continue
    }
    log(`删除 skill: ${name}`)
    if (!args.dryRun) rmSync(dir, { recursive: true, force: true })
  }

  if (!existsSync(patchPath)) {
    log(`patch 不存在，跳过: ${patchPath}`)
    process.exit(0)
  }
  const current = readFileSync(patchPath, 'utf8')
  if (!current.includes('id: preset-arch-orchestrator')) {
    log('preset 声明不存在，跳过 patch')
    process.exit(0)
  }

  const backup = `${patchPath}.bak-${stamp}`
  log(`备份 patch -> ${backup}`)
  if (!args.dryRun) copyFileSync(patchPath, backup)

  // 优先按安装时追加的原文整段移除；退化为按块移除。
  let next
  if (current.includes(fragment)) {
    next = current.split(fragment).join('')
  } else {
    const lines = current.split('\n')
    const out = []
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] === '- insert:') {
        let j = i + 1
        while (j < lines.length && !/^- (id|insert):/.test(lines[j])) j += 1
        if (lines.slice(i, j).join('\n').includes('id: preset-arch-orchestrator')) {
          i = j - 1
          continue
        }
      }
      out.push(lines[i])
    }
    next = out.join('\n')
  }
  if (!next.endsWith('\n')) next += '\n'
  if (!args.dryRun) writeFileSync(patchPath, next)
  log('已移除 preset 声明')

  if (args.dryRun) {
    log('dry-run 结束，未写入任何文件。')
    process.exit(0)
  }
  try {
    verifyPatch({ patchPath, dshHome })
    console.error('警告：仍能解析到 preset 声明，卸载可能不完整。')
    process.exit(1)
  } catch {
    console.log('完成。preset 声明已移除。')
  }
}

function parseArgs(argv) {
  const out = { dshHome: null, profile: null, dryRun: false, uninstall: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dsh-home') out.dshHome = argv[++i]
    else if (arg === '--profile') out.profile = argv[++i]
    else if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--uninstall') out.uninstall = true
    else if (arg === '--help' || arg === '-h') out.help = true
    else {
      console.error(`未知参数: ${arg}`)
      process.exit(2)
    }
  }
  return out
}
