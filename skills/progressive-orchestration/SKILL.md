---
name: progressive-orchestration
description: Compatibility routing skill for legacy progressive-mode references. Use only when explicitly requested by name or when migrating old configurations.
whenToUse: 仅在按名称显式引用本 skill，或在迁移旧配置、恢复引用早期版本路由入口的旧会话时加载；普通任务不要主动加载。
user-invocable: true
disable-model-invocation: false
---

# 渐进模式（路由，v1.2.1）

本 skill 只负责路由；细则在另外三个 skill 中，此处不重复：

| 需要判断什么 | 加载 |
|---|---|
| 影响范围与实现深度（Level 0—4、升级/降级、事实来源原则） | `implementation-depth-analysis` |
| 与深度匹配的计划/设计（Level 2 最小计划 → Level 4 架构权衡与回滚） | `implementation-planning` |
| Agent 选择、并行边界、验证阶梯、失败分类与 Replan | `orchestration-and-verification` |

## 两条最容易搞混的边界

1. **实现深度与 Agent 数量完全独立**：Level 4 不一定需要多 Agent，Level 1 也可能需要独立验证。
2. **Level 表示工程思考深度**，不是任务大小，也不是必须创建的流程或工件；默认最低必要复杂度，有证据才升级，也允许降级。

## 与早期版本的关系

早期版本用 T0—T8 工作架构 + P0—P4 实现规划 + L0—L5 验证强度三条轴；v1.2.1 收成"实现深度（Level 0—4）+ 编排决策独立"：深度归 `implementation-depth-analysis`，编排与验证归 `orchestration-and-verification`。按名称引用本 skill 的历史会话仍能加载它并得到上述路由结果。
