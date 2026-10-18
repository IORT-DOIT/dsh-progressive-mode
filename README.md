# 渐进模式 · Progressive Mode for DeepSeek Harness

> **A minimal-complexity agent preset for DeepSeek Harness (DSH).** Decide implementation
> depth from the task's actual impact *before* adding plans, agents, or verification.
> One preset declaration + four on-demand skills. Frozen baseline v1.2.1.

[![verify](https://github.com/IORT-DOIT/dsh-progressive-mode/actions/workflows/verify.yml/badge.svg)](https://github.com/IORT-DOIT/dsh-progressive-mode/actions/workflows/verify.yml)

一个 DSH **agent preset** 加 4 个**按需加载的 skill**：先用「影响范围」判断实现深度（Level 0—4），再决定是否需要计划、编排与验证。核心主张只有一句——**实现深度与 Agent 数量完全独立**；反对“任务看起来大就先上多 Agent”。

---

## 状态

**v1.2.1 baseline（冻结于 2026-09-26）**，模式 / 策略架构**停止演进**。

2026-10-07 的收敛验证结论为 **A = NO**：在 36 个对照 run 与原生 system prompt 文本证据的范围内，最小策略内核没有可观测的独立策略价值。四个 skill 原样保留，是否收缩/删除由各自的技术价值决定，不由该结论推出。详见 [docs/VALIDATION.md](docs/VALIDATION.md) 与 [docs/RELEASE-v1.2.1.md](docs/RELEASE-v1.2.1.md)。

> 本仓库发布的是**冻结件 + 安装/校验工具**，不是仍在迭代的产品。它适合：想复核这套规程、想借鉴 preset/skill 组装方式、或想在自己的 DSH 里对比 baseline 的人。

## 它做什么 / 不做什么

**做什么**

- 把 1308 B 的常驻规程注入 `persona.suffix`（order 10200，位于第一方指导之后，每次请求都在）；
- 通过 4 个 skill 提供：实现深度 Level 0—4 判据、与深度匹配的计划/设计、编排与验证、以及一个兼容路由件；
- 用常驻层的“默认最低必要复杂度”压制过度编排（计划膨胀、无收益的多 Agent、超配验证）。

**不做什么**

- 不改变模型本身，不替代原生 Plan / Goal / Subagent / Workflow 能力；
- 不含实验装置（triage battery、lab fixture、逐 run 证据）——那些留在作者本地；
- 不修改 DSH 源码，也不改动其它 preset 的行为。

## 环境要求

- **DeepSeek Harness（DSH）**，profile 默认 `desktop`（可用 `--profile` 指定其它 profile）
- **Node.js ≥ 22**（安装器与校验器只用标准库；`js-yaml` 优先从已安装的 DSH 里解析）

## 安装

```powershell
git clone https://github.com/IORT-DOIT/dsh-progressive-mode.git
cd dsh-progressive-mode

node tools/install.mjs          # 复制 4 个 skill + 追加 preset 声明（写入前自动备份）
node tools/verify.mjs --all     # 6 个冻结件哈希 + 本机 patch 的 16 项装配校验
```

安装到非默认位置或其它 profile：

```powershell
node tools/install.mjs --dsh-home D:\dsh-home --profile desktop
```

装好后**重启 DSH**，在新会话的 preset 选择器里选「渐进模式」。默认仍为**标准模式**——安装不会全局改默认。

## 校验与回滚

```powershell
node tools/verify.mjs                          # 仓库内 6 个冻结件的字节数与 SHA256
node tools/verify.mjs --patch <patch 路径>      # 某个 profile 的 preset 装配（16 项断言）
node tools/install.mjs --uninstall             # 移除 4 个 skill 与 preset 声明（写入前自动备份）
```

所有写入前都会留备份：`cordis.patch.yml.bak-<时间戳>`、`SKILL.md.bak-<时间戳>`。
校验器**不需要**在本仓库 `npm install`：它会从已安装 DSH 的 profile `node_modules` 里解析 `js-yaml`（找不到时再提示 `npm install`）。

## 目录

| 路径 | 作用 |
|---|---|
| `preset/progressive.fragment.yml` | 可直接追加进 `cordis.patch.yml` 的 preset 声明（安装器用的就是它） |
| `preset/cordis.patch.yml` | v1.2.1 冻结快照（desktop profile 的完整 preset 声明副本，逐字节归档） |
| `injected-prompt.md` | 常驻规程原文（1308 B，注入到 `persona.suffix`） |
| `skills/implementation-depth-analysis/SKILL.md` | Level 0—4 实现深度、事实来源原则、升级/降级 |
| `skills/implementation-planning/SKILL.md` | 与深度匹配的计划 / 设计 / 架构 |
| `skills/orchestration-and-verification/SKILL.md` | 编排、验证、失败恢复、用户交互规范 |
| `skills/progressive-orchestration/SKILL.md` | 兼容用薄路由（非 v1.2.1 包内文件；仅供旧会话按名引用） |
| `tools/install.mjs` | 安装 / 卸载 |
| `tools/verify.mjs` | 冻结件哈希 + 16 项装配校验 |
| `tools/build-patch.mjs` | 由 `injected-prompt.md` 重建 patch 的 suffix 块（维护用，默认只写 `build/`） |
| `docs/OVERVIEW.md` | 自包含说明：DSH 背景、preset / skill / 提示词槽位、设计取舍、速查表 |
| `docs/RELEASE-v1.2.1.md` | 冻结件、已验证项、已知边界、治理规则 |
| `docs/VALIDATION.md` | 三轮验证的结论摘要 |

## 冻结件（SHA256 前 12 位）

| 文件 | 字节 | SHA256 |
|---|---|---|
| `injected-prompt.md` | 1308 | `66aaed34b214` |
| `preset/cordis.patch.yml` | 11492 | `0863bd9276a6` |
| `skills/implementation-depth-analysis/SKILL.md` | 1293 | `e545c29ccc31` |
| `skills/implementation-planning/SKILL.md` | 613 | `e9cd9c14c5d1` |
| `skills/orchestration-and-verification/SKILL.md` | 2569 | `c64f33ab9f9b` |
| `skills/progressive-orchestration/SKILL.md` | 1644 | `4bf69e60eac5` |

任何一项变化都意味着版本必须递增。`preset/cordis.patch.yml` 是**宿主可写文件**的安装时快照：DSH 会往 live patch 里写 GUI 状态字段，因此 live patch 的字节哈希不是“模式是否被改动”的有效判据，**语义校验（16 项）才是**。

## 治理规则

1. **新需求必须来自真实失败案例**：给出具体会话/行/时间与可复核证据（session 帧、命令输出、diff）。没有证据，不实施。
2. **不接受“感觉可能需要加规则”**：这类只登记为候选观察（`观察 | 证据等级 | 触发条件`），不实施、不改冻结件。
3. **改动冻结件 = 版本递增**：新增 `RELEASE-vX.Y.Z`、更新哈希基线，并重跑 install / discovery / GUI 三项验证。
4. **回滚路径保持可用**：`.bak-*` 备份不得删除。
5. **运行时状态判断必须基于最终有效状态**：读最后一个 `agent-preset/selected` 事件，而不是会话创建时的 `agentPreset` 字段。

## 已知边界（不是待办）

- 大规模并行编排未经压力测试：一次 3×100 行独立模块的审计实测是“串行 + 独立复核”，质量未受损但并行正例未被压出。
- `ralph` 工具不在本 preset 中（规程已注明“运行时没有它就不要引用”）。
- 沙箱与审批行为不在基线声明范围内（行为测试以 `danger-full-access` 运行）。
- 每行行为测试只跑一次，无重复性统计。
- 「用户交互规范」住在按需加载的 skill 里，Level 0 等零 skill 会话看不到它。

## 版本历史

| 版本 | 变化 |
|---|---|
| v0 | 原始 zip：T0—T8 / P0—P4 / L0—L5 三轴，常驻规程 8834 B |
| v1.0—v1.1 | T1“固定编排”/ T3“动态编排”；T2 更名“并行编排”并加启用条件；Replan 限定为编排失败后 |
| v1.2 | 重构瘦身：常驻规程 1465 B；P0—P4 → Level 0—4 并移入 `implementation-depth-analysis`；“实现深度 ⊥ Agent 数量”进入常驻层 |
| v1.2.1 | 补回操作细节（O&V 441 B → 1182 B）、depth skill 补“事实来源原则”、补“用户交互规范” |
| **v1.2.1 baseline** | 2026-09-26 起冻结；2026-10-07 模式/策略架构停止演进 |

## License

[MIT](LICENSE)
