# Changelog

## [0.3.2] - 2026-10-24

### Removed
- 删除宠物模式：客户端不再包含帧资源、宠物 CSS 与挂载逻辑，仓库与安装包都不再带宠物。

### Fixed
- 播报里的工具名：`tool/result` 的 `toolCallId` 在消息顶层，之前找错了位置，导致显示成「工具」。

## [0.3.1] - 2026-10-24

### Added
- 启动诊断日志：`~/.dsh/jiahao-mode.boot.log`（apply 开始、人设段注册、路由注册结果）。
- 路由注册包 try/catch，注册失败只记日志，不影响人设段。

## [0.3.0] - 2026-10-24

### Added
- HUD 面板内三档嘴臭切换：屏息 / 小声豪 / 放开豪。
- Host 新接口 `POST /jiahao/api/tone`，写回 volatile 配置，下一轮请求立即生效。
- `/jiahao/api/state` 返回当前档位。

## [0.2.0] - 2026-10-24

### Added
- 豪气值：基于 session 事件（tool/call、tool/result、turn/end）累计，范围 0–100。
- 右上角 HUD 面板：豪气条、击杀/卡了/连杀/最佳连杀、可折叠。
- 击杀播报：成功/失败/结算三类，最多保留 6 条。
- 结算卡：每回合结束评 S/A/B/C，自动消失。
- Host HTTP 接口：`/jiahao/api/state`、`/jiahao/api/feed`。
- 客户端 `lib/client.js`（无宠物，宠物只在个人版）。

### Planned
- v0.3：命令与战绩持久化。

## [0.1.0] - 2026-10-24

### Added
- Host half：注册 `jiahao:mode` 人设段（四条行为准则 + 质量红线）。
- 三档嘴臭：`quiet` / `normal` / `loud`，volatile 配置，改完即时生效。
- 与其它人设的互斥/叠加开关（软互斥，声明优先级）。
- 纯函数人设构建器 `lib/persona.mjs` 与 4 条单测。
- 设计文档 v1.6（无宠物模块）。

### Planned
- v0.3：`/推进`、`/卡了`、`/铜泥丸`、`/战绩`。
