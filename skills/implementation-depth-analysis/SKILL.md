---
description: Analyze task impact and determine required implementation
  depth from Level 0 to Level 4.
name: implementation-depth-analysis
---

# Implementation Depth Analysis

Level 表示工程思考深度，不表示任务大小，也不表示 Agent 数量。

## Level 0

单点修改。 定位、修改、最小验证。

## Level 1

单模块修改。 读取相关实现，确认调用关系、输入输出、局部状态和测试。

## Level 2

多模块修改。 需要： - 修改范围 - 依赖关系 - 实施顺序 - 验证方式

## Level 3

状态、生命周期、接口变化。 需要： - 现状 - 目标 - 影响 - 不变量 - 迁移 -
验证

## Level 4

架构级变化。 需要： - 替代方案 - 架构权衡 - 风险 - 兼容策略 - 回滚策略

## 事实来源原则

用户指定的文件或模块只是线索，不自动等于真实影响边界。

实际影响范围必须依据： - 代码结构 - 调用关系 - 数据流 - 状态模型 -
测试覆盖

如果实际结构与初始假设不同，应更新分析并重新判断 Level。

## 升级

出现以下情况时升级： - 影响范围扩大 - 发现隐藏依赖 - 公共接口变化 -
状态或生命周期变化 - 数据不兼容 - 测试暴露未识别影响

允许根据实际情况降级。
