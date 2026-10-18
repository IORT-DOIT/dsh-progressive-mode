# 渐进模式（Progressive Mode）与配套 Skill 说明

**版本：v1.2.1 baseline（冻结于 2026-09-26）**
**运行平台：DeepSeek Harness（DSH）**
本文是给"外部读者/AI 讨论"用的自包含说明：先介绍 DSH 的必要背景，再说明模式与 skill 的组织、功能与关系。文中所有尺寸与哈希都可在文末复核命令中逐项验证。

---

## 一、运行平台：DeepSeek Harness（DSH）是什么

DSH 是一个**由插件组合（composition）驱动的 Agent 运行时**，不是一个固定行为的单体程序。与本文相关的特点：

1. **profile = 分层补丁栈**
   DSH 启动一个 `profile`（如 `desktop`、`web`、`headless`），其组合方式是"若干个 plugin bundle 的 patch 层 + 用户层补丁（`cordis.yml` / `cordis.patch.yml`）+ 命令行 `--patch` 叠加"。补丁可以**按 id 覆盖**已有条目的配置，也可以用 `insert` **新增**条目。因此部署方改的是"组合"，不是源码。

2. **Agent Preset（会话模板）**
   preset 是一行声明（`@deepseek-ai/dsh-agent-preset`），字段为 `id / name / description / order / plugins[]`，`plugins[]` 列出该 preset 要挂载的子插件行（工具、persona、compaction、委派能力等）。新会话选定一个 preset；会话头记录 `agentPreset`。**运行中的 Agent 保留它挂载时的 preset 修订（revision）**，子 Agent 会继承父 Agent 保留的那份修订。本文的"渐进模式"就是这样一个 preset（`id: arch-orchestrator`，显示名「渐进模式」）。

3. **系统提示词是"有序 section 的装配结果"**
   每次模型请求前，DSH 把若干 **section** 按 order 升序拼成 system prompt（同名 section 在 agent 作用域会**遮蔽**全局的）。与本模式相关的槽位：
   - `harness:identity`（order −1000）：固定开场白；
   - `deployment:persona-prefix`（order 0）：部署/模式人设前缀；
   - 第一方指导与工具文档；
   - `deployment:persona-suffix`（order **10200**）：人设后缀——**本模式的常驻规程就住在这里**。
   文本支持变量插值（如 `{{cwd}}`、`{{model}}`），渲染时严格解析：出现未注册的 `{{...}}` 会**直接报错**而不是静默通过。

4. **没有终端用户的提示词编辑 API**
   面向模型的提示词文本只能来自"配置/组合"。这正是本模式**借道 preset 里 `@deepseek-ai/dsh-persona` 行的 `suffix`** 来注入常驻规程的原因（而不是改某个提示词文件）。

5. **Skill = 按需加载的文件包**
   `@deepseek-ai/dsh-skill` 是注册表，`@deepseek-ai/dsh-skill-filesystem` 是文件系统提供方：扫描若干根目录（按优先级：项目 `.dsh/skills` → `.agents/skills` → 自定义目录 → **`<dshHome>/skills`** → `~/.agents/skills`），把每个 `<name>/SKILL.md`（或平铺 `<name>.md`）的 frontmatter 解析成目录条目。模型通过 `skill` 工具**按需**加载正文。
   - frontmatter **必须**有 `name` 与 `description`；**缺 description 会被静默丢弃并给出一条 warning**（本项目实测踩过）；
   - 可选 `whenToUse`、`user-invocable`、`disable-model-invocation`；
   - 正文只在被加载时进入上下文，因此"常驻"与"按需"是两个不同的成本层。

6. **工具面由 preset 行决定**
   本 preset 挂载的工具包括：文件读写/搜索（`read`/`write`/`edit`/`glob`/`grep`）、shell（Windows 为 `pwsh`）、后台作业、`subagent` 与 `subagent_fork`、`workflow`、`goal`、`todo_write`、`ask_user_question`、`present` 等；**`ralph` 在本 preset 中是关闭的**。

7. **会话是可回放的事件日志**
   会话以追加式 zstd 压缩的 JSONL 帧持久化，事件类型包括 `user/message`、`system/message`（模型看到的系统提示词快照）、`tool/call`、`tool/result`、`assistant/message`、`agent-preset/selected` 等。**这使"模型实际收到什么提示词"可以被离线取证**（本文的验证就是这样做的）。
   ⚠️ 一个运维陷阱：`agentPreset` 只在**会话创建时**写进会话头；此后在 GUI 里切换 preset 只记在 `agent-preset/selected` 事件里。判断"当前生效 preset"必须读事件，不能读创建头（本项目真实误报案例，已沉淀为治理规则第 5 条）。

8. **权限与沙箱是会话级状态**
   会话创建时按 permission preset 播种（`read-only` / `workspace-write` / `danger-full-access`），并可能被环境变量覆盖（本项目实测 `DSH_PERMISSION_MODE` 覆盖了 profile 默认值）。

9. **组合是可热加载的，但"已挂载的 Agent"不追新**
   profile 补丁改动会影响**之后创建**的 Agent；已有会话保持其原有装配。此外运行中的应用可能**自己重写** profile 补丁（本项目实测：它按自身行宽重新折行、并写入 GUI 里的设置变更），所以"快照"与"live"需要周期性对账。

---

## 二、渐进模式是什么

一句话：**它是一套"按任务实际影响范围，逐级增加分析 / 设计 / 编排 / 验证深度"的执行规程；它不是身份设定，也不要求任何固定流程。**

它由两层组成：

| 层 | 载体 | 何时进入上下文 | 体量 |
|---|---|---|---|
| **常驻层（决策方向）** | preset `arch-orchestrator` 的 `persona.suffix`（order 10200） | **每次请求**都在 system prompt 里 | 1308 B |
| **按需层（细则）** | `<dshHome>/skills` 下的 3 个 skill | 模型按路由**按需**用 `skill` 工具加载 | 1293 + 613 + 2569 B |

常驻层只回答两件事：**总原则**与**决策方向**；它刻意不包含任何细则（不写检查清单、不写输出格式）。细则全部下沉到 skill——这是 v1.2 起的核心取舍：**常驻成本降低约 6 倍，同时把"实现深度 ≠ Agent 数量"写进常驻原则**。

### 常驻规程的内容（1308 B）

- **核心目标**：根据任务实际影响范围，逐步增加分析、设计、编排和验证深度。
- **默认采用最低必要复杂度。**只有证据表明当前处理深度不足时才升级。
- **不要为了使用本模式而增加计划、文档、Agent 或流程。**
- **核心原则 8 条**（原文要点）：先理解影响范围再决定实现深度；**实现深度与 Agent 数量完全独立**；简单任务直接执行；修改前识别边界、依赖与副作用；涉及状态/生命周期/数据模型/接口/架构时优先设计后实现；验证强度匹配风险；优先复用已有代码、抽象和工件；不虚构未观察到的代码影响、测试结果或运行指标。
- **工作循环**：理解目标 → 分析影响范围 → 判断实现深度 → 选择执行方式 → 实施修改 → 验证结果（执行中允许升级或降级）。
- **Skill 路由**（三条，按需加载）：`implementation-depth-analysis`（判断工程深度）/ `implementation-planning`（生成与深度匹配的计划与设计）/ `orchestration-and-verification`（编排、验证、失败恢复）。
- **收尾**：不要为了流程而流程；最终目标是可靠完成用户目标。

---

## 三、配套 Skill 的功能与结构

三个 v1.2.1 skill（外加一个我方的兼容件，见 §五）：

### 1. `implementation-depth-analysis`（1293 B）— 判断"要想多深"

| 章节 | 内容 |
|---|---|
| Level 0 | 单点修改：定位 → 修改 → 最小验证 |
| Level 1 | 单模块修改：读相关实现，确认调用关系 / 输入输出 / 局部状态 / 相关测试 |
| Level 2 | 多模块修改：修改范围 / 依赖关系 / 实施顺序 / 验证方式 |
| Level 3 | 状态、生命周期、接口变化：现状 / 目标 / 影响 / 不变量 / 迁移 / 验证 |
| Level 4 | 架构级变化：替代方案 / 架构权衡 / 风险 / 兼容策略 / 回滚策略 |
| **事实来源原则** | 用户指定的文件或模块只是线索，不自动等于真实影响边界；影响范围必须依据代码结构、调用关系、数据流、状态模型、测试覆盖；与初始假设不同则更新分析并重判 Level |
| 升级 | 影响扩大 / 隐藏依赖 / 公共接口变化 / 状态或生命周期变化 / 数据不兼容 / 测试暴露未识别影响 → 升级；允许降级 |

要点：**Level 表示"工程思考深度"，不是任务大小，也不是 Agent 数量，更不是必须创建的流程。**

### 2. `implementation-planning`（613 B）— 生成与深度匹配的计划/设计

- 第 1 句即约束：**开始规划前，应确认当前 Implementation Level**；不对低风险任务强制执行高级设计。
- Level 2：最小实现计划（修改范围 / 依赖关系 / 实施顺序 / 关键工件 / 验证方式 / 不修改区域）。
- Level 3：追加当前状态 / 目标状态 / 影响面 / 不变量 / 迁移策略 / 验证方案。
- Level 4：追加"为什么需要架构变化" / 替代方案 / 架构权衡 / 兼容策略 / 分阶段迁移 / 回滚方案。

**它与 depth skill 的依赖关系是单向的：planning 读 Level，depth 不读 planning。**

### 3. `orchestration-and-verification`（2569 B）— 谁来做、怎么验证、失败怎么办

| 章节 | 内容 |
|---|---|
| 开篇定调 | **实现深度和 Agent 编排是两个独立维度。**Level 4 不一定需要多 Agent，Level 1 也可能需要独立验证 |
| Agent 选择 | `subagent`（独立调查/局部实现/局部审查）、`subagent_fork`（已有上下文价值/需要独立视角）、`workflow`（多个真正独立工作块/存在并行收益）、`goal`（跨多轮持续目标）、`ralph`（仅在明确需要时；**并注明本 preset 未挂载该工具，运行时没有就不要引用**） |
| 并行边界 | 适合：工作单元独立 / 修改区域低冲突 / 通信成本低于收益；不要并行：同一核心状态 / 高耦合模块 / 需要统一设计决策 |
| 上下文与状态 | 子 Agent 只获得必要上下文，不传播完整聊天历史；状态放工作区、文件或工件；优先复用已验证工件 |
| 验证阶梯 | 确定性验证 > 程序测试 > 静态检查 > 集成测试 > 独立审查 > 多视角 > 人工确认；**不要仅依赖 LLM 判断正确**；**测试通过 ≠ 符合已确认设计**；高风险/不可逆/重大成本交由用户确认；**独立验证、审查或复核任务尚未返回结果前，不得将其视为已完成验证，不得基于未返回结果声明任务完全验证通过** |
| 失败分类 | 执行错误→修复并 Retry；理解错误→更新影响分析；策略错误→Replan；架构错误→升级实现深度；**Replan 五步**：保留已验证成果 → 定位受影响范围 → 重新判断实现深度与执行方式 → 更新工件 → 继续未完成部分；需求变化时立即重新评估；失败后不要无限重复同一方案 |
| 用户交互规范 | 「不要向用户输出内部调度账本。」不展示内部 Level 判断过程 / Agent 调度细节 / 未验证 telemetry / 不必要的项目管理信息；只输出必要决策、修改结果、验证结果、需要用户确认的事项；仅在高风险不可逆、重大成本、无法消除的需求歧义、涉及用户价值判断的方案选择时请求用户决策 |

---

## 四、模式与 skill 的关系

```text
                    ┌──────────────────────────────────────────────────┐
   常驻层            │  persona.suffix（order 10200）：渐进模式规程 1308 B │
   （每次请求都在）   │  核心目标 / 8 条核心原则 / 工作循环 / Skill 路由     │
                    └───────────────────────┬──────────────────────────┘
                                            │ 按需路由（模型自行加载）
              ┌─────────────────────────────┼─────────────────────────────┐
              ▼                             ▼                             ▼
   implementation-depth-analysis   implementation-planning   orchestration-and-verification
   Level 0–4 / 事实来源 / 升•降级    L2–L4 计划与设计内容       Agent 选择 / 并行边界 / 上下文状态 /
              │                             │                 验证阶梯 / 失败分类 / 用户交互规范
              │   planning 先读 Level（单向依赖）
              └─────────────────────────────┘
                            │
                            ▼
                     执行 → 验证（L 轴由 O&V 定义）
```

三条关系要点：

1. **一个轴 vs 两个决策**：v1.2.1 只有**一个分级轴**（实现深度 Level 0–4）；"谁来做"（编排）与"怎么证明"（验证）被明确划为**与 Level 正交**的独立决策，统一归 `orchestration-and-verification`。这是对更早版本（T0–T8 工作架构 + P0–P4 实现规划 + L0–L5 验证强度三条轴、19 级）的收敛。
2. **路由而非包含**：常驻层只写"什么时候该加载哪个 skill"，不复制 skill 内容；skill 之间也不互相复制（`progressive-orchestration` 只做路由表，见 §五）。
3. **两层的成本模型不同**：常驻层每次请求都付 1308 B；skill 只在被加载的那一轮付费。因此**判断"该不该加载"本身是被设计过的**：Level 0 一行修复的理想路径是 0 次 skill 加载。

---

## 五、兼容件：`progressive-orchestration`（1644 B，非 v1.2.1 包内）

早期版本用一个"入口 skill"承载 T0–T8/L0–L5 全文。v1.2.1 已把这些内容拆进上面三个 skill，因此该文件在本版中**降级为兼容路由**：

- frontmatter 的 `description` 是英文兼容说明（`Compatibility routing skill for legacy progressive-mode references…`），`whenToUse` 也收紧为"仅按名称显式引用，或迁移旧配置/旧会话时加载"；**普通任务不会主动加载它**；
- 正文只剩"路由表 + 两条最易混淆的边界 + 与早期版本的关系"；
- 保留它的唯一理由是：历史会话可能按名称引用它。

---

## 六、装配路径（从声明到模型看到的一句话）

```text
~/.dsh/profiles/desktop/cordis.patch.yml
  └─ insert: preset-arch-orchestrator            （preset 声明：id/name/description/plugins[]）
        └─ plugins: - id: persona  (@deepseek-ai/dsh-persona)
              config:
                prefix: You are a coding agent powered by the {{model}} model.
                suffix: |                       ← 渐进模式规程 1308 B 就在这里
                  Your working directory is {{cwd}}.
                  # 渐进模式 v1.2.1 …
        └─ plugins: - id: skill-filesystem (@deepseek-ai/dsh-skill-filesystem)   ← 默认根 <dshHome>/skills
        └─ plugins: - id: tool-skill       (@deepseek-ai/dsh-tool-skill)         ← 模型按需加载 skill 的入口
        └─ plugins: - id: delegation…      (subagent / subagent_fork / workflow / goal …)

新会话挂载该 preset
  → persona 行在 agent 作用域注册 deployment:persona-suffix（order 10200，遮蔽部署级默认）
  → 系统提示词 = 按 order 拼接的所有 section（含上述 suffix）
  → 模型看到规程；skill 目录里可见 4 个 skill（含兼容件）
```

**实测证据**（本项目）：新建并绑定该 preset 的 agent，其 `deployment:persona-suffix` 段为 **600 字符**（`{{cwd}}` + 规程），v1.2.1 的 5 个探针 5/5 命中；全局（未绑定 preset 的）同名段为 0 字符——即这段文本确实**来自 preset 行**，而非部署级默认。

---

## 七、版本、冻结与治理

- 冻结件（6 项）。**快照**冻结于安装时；**live 的 `cordis.patch.yml` 是宿主管理的**：GUI 改设置或切换 preset 时，应用会把 `transcriptView` / `selectedDefault` 等字段写回该文件，因此 live 字节可能漂移。模式改动的门禁**不是字节哈希**，而是 §八 第 2 条那道 16 项校验（含 `persona.suffix` 与 `injected-prompt.md` 逐字节一致）。
  - 2026-09-26 16:47 实测漂移：live = `2c4c279cf3fd` / 11500 B（`transcriptView: compact`、`selectedDefault: arch-orchestrator`），快照仍为 `0863bd9276a6` / 11492 B；**模式内容未变**。

| 冻结件 | 字节 | SHA256 前 12 |
|---|---|---|
| `cordis.patch.yml`（preset 声明） | 11492 | `0863bd9276a6` |
| `injected-prompt.md`（常驻规程原文） | 1308 | `66aaed34b214` |
| `implementation-depth-analysis/SKILL.md` | 1293 | `e545c29ccc31` |
| `implementation-planning/SKILL.md` | 613 | `e9cd9c14c5d1` |
| `orchestration-and-verification/SKILL.md` | 2569 | `c64f33ab9f9b` |
| `progressive-orchestration/SKILL.md`（兼容件） | 1644 | `4bf69e60eac5` |

- **治理规则 5 条**（第 1–4 条在 `RELEASE-v1.2.1.md` §治理规则，第 5 条是本次事故沉淀）：
  1. 新需求必须来自**真实失败案例**（给出会话/行/时间 + 可复核证据）；没有证据不实施。
  2. 不接受"感觉可能需要加规则"——只登记为**候选观察**，不实施、不改冻结件。
  3. 改动冻结件 = **版本递增**，重跑 install / discovery / GUI 三项验证。
  4. 回滚路径（`.bak-*`）不得删除。
  5. **运行时状态判断必须基于最终有效状态。** 不得仅依据创建时 metadata、初始化字段或默认配置推断当前状态。当存在状态变更事件、覆盖配置或后续选择记录时，应以最终有效事件状态为准。
     例：preset 生效状态应读取最终 `agent-preset/selected` 事件，而非 session 创建时的 `agentPreset` 字段。

---

## 八、验证与复核命令（一条条跑）

```powershell
# 1) 冻结件哈希：与 §七 表格逐行比对
node tools\verify.mjs
# 2) preset 装配 16 项校验（含 persona.suffix 与 injected-prompt.md 逐字节一致）
node tools\verify.mjs --patch "$env:USERPROFILE\.dsh\profiles\desktop\cordis.patch.yml"
# 3) 安装 / 回滚（写入前自动备份 patch 与 skill）
node tools\install.mjs
node tools\install.mjs --uninstall
```

---

## 九、已知边界（不是待办）

1. **大规模并行编排未经压力测试**：一次 3×100 行独立模块的审计任务实测走的是"串行 + 独立复核"而非并行（质量未受损：预埋缺陷召回 12/12）。判据（"存在真实并行收益"）本身是主观的。
2. **`ralph` 在本 preset 中未挂载**（规程里已注明"没有就不要引用"）。
3. **沙箱与审批行为不在本基线声明范围内**：相关行为测试是以 `danger-full-access` 运行的。
4. **每行行为只跑一次**，无重复性统计。
5. **「用户交互规范」住在按需加载的 skill 里**：Level 0 等零 skill 会话看不到它（补齐需要动冻结的 persona，风险已评估、未做）。
6. 装配路径已在"真实 Host + 真实 registry + 未改动的 preset 定义"下验证，但**桌面应用的会话控制器代码本身**未逐行审计。

---

## 十、速查表

| 问题 | 答案 |
|---|---|
| 模式住在哪？ | preset `arch-orchestrator` → `persona.suffix`（order 10200），1308 B，每次请求都在 |
| 为什么不用提示词文件？ | DSH 没有终端用户提示词编辑 API，文本只能来自配置/组合 |
| 细则在哪？ | `<dshHome>/skills` 下 3 个 skill，按需加载（+1 个兼容路由件） |
| 有几个分级？ | **1 个轴**：实现深度 Level 0–4；编排与验证与它正交 |
| 谁会加载 skill？ | 模型自己按常驻层的路由判断；Level 0 的理想路径是 0 次加载 |
| 怎么证明提示词真的进去了？ | 会话日志的 `system/message` 帧 + 5 个探针；§八 的一条命令 |
| 怎么判断"当前生效 preset"？ | 读最后一个 `agent-preset/selected` 事件，**不要**读会话创建头（治理规则第 5 条） |
| 改动规则？ | 必须有真实失败案例证据；改冻结件 = 版本递增 |
