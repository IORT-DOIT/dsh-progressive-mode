# Progressive Mode v1.2.1 — 归档

**Status: Baseline**（冻结于 2026-09-26）

本文档是**归档记录**，不是计划、不是待办清单。冻结后的任何改动按 §治理规则 走。

> **2026-10-07 收敛验证裁决（只针对模式层）**：内部收敛验证报告（未随仓库发布，A–G）的结论为 **A = NO** —— 在 36 个对照 run（A/B/C/D/M × T1–T9，两轮）与原生 system prompt 文本证据（X2）的范围内，最小策略内核没有可观测的独立策略价值。用户据此**将渐进模式的「模式 / 策略架构」冻结为「停止演进」**：Level 体系、策略门、常驻 persona 注入与 v2.0 实施计划一律不再演进。
> 本归档的 **6 项冻结件未做任何改动**（哈希同 §Frozen）。
> **四个 Skill 原样保留、暂缓处理**：是否保留 / 改名 / 收缩 / 删除**不得由 A = NO 推出**，须由**各自的任务技术价值审核**单独决定（本轮未测量它们的任务技术价值）。
> **Plan / Goal 原生边界**：T5 / T6 未经真实人工触发 → **BLOCKED-UNVERIFIED**，不纳入 Progressive 价值判断，也不据此推导任何结论。

---

## Frozen（冻结件）

live 位置指实际生效路径；快照即本仓库内的对应文件。

| 冻结件 | live 载体 | 快照 | 字节 | SHA256（前 12） |
|---|---|---|---|---|
| persona prompt（常驻规程） | `cordis.patch.yml` → `preset-arch-orchestrator` → `persona.suffix` | `injected-prompt.md`（原文） | 1308 | `66aaed34b214` |
| preset 声明 | `~/.dsh/profiles/desktop/cordis.patch.yml` | `preset/cordis.patch.yml` | 11492 | `0863bd9276a6` |
| depth analysis | `~/.dsh/skills/implementation-depth-analysis/SKILL.md` | `skills/implementation-depth-analysis/SKILL.md` | 1293 | `e545c29ccc31` |
| planning | `~/.dsh/skills/implementation-planning/SKILL.md` | `skills/implementation-planning/SKILL.md` | 613 | `e9cd9c14c5d1` |
| orchestration verification | `~/.dsh/skills/orchestration-and-verification/SKILL.md` | `skills/orchestration-and-verification/SKILL.md` | 2569 | `c64f33ab9f9b` |
| 兼容路由（**非 v1.2.1 包内**，仅供旧会话按名引用） | `~/.dsh/skills/progressive-orchestration/SKILL.md` | `skills/progressive-orchestration/SKILL.md` | 1644 | `4bf69e60eac5` |

- 上表 6 项在**安装时** live 与快照 SHA256 全部相同（本次实测）。
- **2026-09-26 16:47 漂移记录（宿主写入，非模式改动）**：live `cordis.patch.yml` 变为 `2c4c279cf3fd` / 11500 B —— 应用把两个 GUI 状态字段写回该文件（`transcriptView: standard → compact`、`selectedDefault: standard → arch-orchestrator`）。快照保持安装时字节 `0863bd9276a6` / 11492 B。
  模式内容**未变**：16 项装配校验仍 **16/16**，`persona.suffix` 与 `injected-prompt.md` 仍逐字节一致。
  **判定口径**：patch 的**字节哈希不是"模式是否被改动"的有效判据**（它是宿主可写文件），语义校验（16 项）才是；live 与快照的字节比对只在同一次同步之后才有意义。
- persona prompt 的 live 载体是 patch 里的 suffix；`injected-prompt.md` 只存在于快照侧，两者"逐字节一致"由 16 项装配校验的第 3 项断言保证。
- 冻结即"以这 6 个哈希为基线"；任何一项变化都意味着版本必须递增（见 §治理规则 第 3 条）。

## Verified（已验证）

| 项 | 方法与证据 | 结果 |
|---|---|---|
| install | 对 live patch 的 16 项装配校验（结构不变量 + suffix 逐字节 + v1.2.1 断言；本仓库为 `tools/verify.mjs`） | **16/16 PASS** |
| discovery | 应用自身的 skill 发现器（内部脚本，未随仓库发布） | **4/4 VISIBLE** |
| headless | 真实 Host 新会话 `dsh --profile modetest --json`，四行 A/B/C/D（内部行为测试记录，未随仓库发布） | 注入 4/4；Level 0 零编排成立 |
| GUI | 真实桌面根会话 `session-0cb2d027`（cwd = 本工作区，depth 0）在 GUI 内切到「渐进模式」后重装 system prompt：8857 字符、注入探针 **5/5**（内部探针脚本，未随仓库发布） | **PASS** |
| behavior tests | A 错别字→Level 0 直改、0 委托；B 两文件同字段→拒绝过度编排；C 状态流转→Level 3 单 Agent；D 三模块审计→召回 12/12 | A/B/C 符合，D 见下 |

## Known limitations（已知边界，不是待办）

- **large-scale parallel orchestration not stress-tested**：D 行（3×100 行独立模块、要求 4 份报告）实测走的是"串行 + 独立复核"，没有被并行化。质量未受损（种子缺陷召回 12/12），但 T2 正例未被压出；判据本身是主观的，更大单元下未测。
- **ralph disabled in current preset**：本 preset 未挂载该工具；规程里已注明"运行时没有它就不要引用"。
- 沙箱与审批未纳入行为复测：headless 各行以 `danger-full-access` 运行，因此本归档不对沙箱/审批行为作任何声明。
- 每行只跑一次，无重复性统计；D 的 649 秒含"复核—修正"循环。
- 「用户交互规范」住在**按需加载**的 skill 里：Level 0 等零 skill 会话看不到这些规则。补齐要动冻结的 persona，风险已接受、**未做**。

## 治理规则（自本归档起生效）

1. **新需求必须来自真实失败案例**：须给出具体会话 / 行 / 时间，以及可复核证据（session 日志帧、命令输出、diff）。没有证据，不进入实施。
2. **不接受「感觉可能需要增加规则」**：这类只登记为**候选观察**，格式为 `观察 | 证据等级 | 触发条件`，不实施、不改冻结件。
3. **改动冻结件 = 版本递增**：新增 `RELEASE-vX.Y.Z` 归档、更新 SHA256 基线，并重跑 install / discovery / GUI 三项验证；headless 与行为测试按改动影响面决定是否重跑。
4. **回滚路径保持可用**：`README.md` §回滚 的 `.bak-*` 列表为最后一道防线，不得删除。
5. **运行时状态判断必须基于最终有效状态。**

   不得仅依据创建时 metadata、初始化字段或默认配置推断当前状态。

   当存在状态变更事件、覆盖配置或后续选择记录时，应以最终有效事件状态为准。

   例如：

   - preset 生效状态应读取最终 `agent-preset/selected` 事件；
   - 不应仅依据 session 创建时的 `agentPreset` 字段。

   本条完整文本以 `README.md` §治理规则第 5 条为准，此处逐字引用；事故证据见内部行为测试记录 §6.1（未随仓库发布）。

### 已登记的候选观察（**未实施**，等真实失败案例）

| 观察 | 证据等级 | 触发条件 |
|---|---|---|
| T2 并行编排未被压出（执行者偏向"串行 + 独立复核"） | 单次 fixture（D 行） | 出现"本可并行却串行导致超时/成本超限"的真实案例，或放大单元规模后复现 |
| 兼容路由 skill `progressive-orchestration` 是否彻底删除 | 单次观测（A/B 行各加载 1 次，description 已收紧） | 收紧后仍被普通任务加载，或出现真实误加载成本 |

## 复核命令（一条条跑）

```powershell
# 1) 冻结件哈希：与 §Frozen 表格逐行比对（本仓库内 6 个文件）
node tools\verify.mjs

# 2) preset 装配 16 项校验（含 persona.suffix 与 injected-prompt.md 逐字节一致）
node tools\verify.mjs --patch "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml"

# 3) 由 injected-prompt.md 重建 patch 的 suffix 块（默认只写到 build/，不碰 live）
node tools\build-patch.mjs --patch "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml"

# 4) 安装 / 回滚（写入前自动备份 patch 与 skill）
node tools\install.mjs
node tools\install.mjs --uninstall
```

> 安装 / discovery / GUI 三项原始验证的逐次记录保存在作者本地（未随仓库发布）；本仓库发布的是可复核的冻结件与便携校验器。
