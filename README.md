# 嘉豪模式 · Jiahao Mode

> 让 DeepSeek Harness（DSH）变成一个玩威龙的绝活哥：活要干对，但每一步都要「豪」出声。
>
> 非官方粉丝项目，与腾讯、琳琅天上、《三角洲行动》官方无关，非商业用途。

**状态**：v0.1 · Host 侧已实现（人设注入 + 三个开关）· HUD 与豪气值面板在 v0.2。

---

## 这是什么

嘉豪模式是一个 DSH 人设/行为插件：它不改变交付标准，只改变「做事的方式」和「说话的味道」。

| 层 | v0.1 状态 | 内容 |
| --- | --- | --- |
| 行为准则 | ✅ 已实现 | 接活「我累铜泥丸」／开打「往里豪」／打输「卡了」／打赢「我从来都没虚」 |
| 嘴臭分档 | ✅ 已实现 | 屏息 / 小声豪 / 放开豪，只改说话密度，不改验收标准 |
| 人设互斥 | ✅ 已实现 | 与其它人设（含鲸鱼娘）互斥，可切换成叠加 |
| 豪气值 | 🚧 v0.2 | 面板与数值统计 |
| 击杀播报 / 结算卡 | 🚧 v0.2 | 覆盖层与结算画面 |
| 命令与战绩 | 🚧 v0.3 | `/推进` `/卡了` `/铜泥丸` `/战绩` |

## 安装

v0.1 可以直接从 GitHub 装（把 `<owner>` 换成仓库所有者）：

```bash
dsh plugin --profile desktop add github:<owner>/dsh-jiahao-mode
```

或者用本地包：

```bash
dsh plugin --profile desktop add /path/to/dsh-jiahao-mode
```

装完刷新页面；卸载：

```bash
dsh plugin --profile desktop remove dsh-jiahao-mode
```

## 配置

三个开关都在 DSH 设置里，改完即时生效（volatile 配置，不用重启插件）：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关，关掉后不注入任何人设 |
| `tone` | `normal` | 嘴臭档位：`quiet`（屏息）/ `normal`（小声豪）/ `loud`（放开豪） |
| `exclusive` | `true` | 与其它人设互斥；设为 `false` 则叠加 |

**互斥是软互斥**：v0.1 不会去关别的插件，而是在本段里声明优先级——「若上文存在其它人设，以嘉豪模式为准」。关掉本模式后，其它人设自然恢复。

## 开发

```bash
npm test          # 纯函数单测：人设正文、档位、互斥、配置归一化
```

目录：

```
lib/persona.mjs     人设正文构建（纯函数，可单测）
lib/index.mjs       Cordis 插件：注册 jiahao:mode 段 + volatile 配置
cordis.patch.yml    profile 补丁层
docs/               设计文档 v1.6
```

## 文档

- [设计文档 v1.6（中文，Word）](docs/嘉豪模式-设计文档-v1.6.docx)

## 仓库原则

- 不含任何游戏美术资源、角色立绘、游戏截图或官方 logo。
- 不修改上游 DSH；卸载后不残留状态。
- 所有提示词注入都可关闭，且不改动验收标准。

## 免责声明

本项目是《三角洲行动》玩家社区的二创作品，仅供学习与娱乐。文中出现的游戏名称、干员名、武器名、口头禅等均归其权利人所有，本项目与官方无任何关联，也不代表官方立场。请勿用于商业用途。

## 许可

代码与文档以 [MIT](LICENSE) 授权；第三方名称与商标不在此授权范围内。

---

## English

Jiahao Mode is a fan-made persona plugin for DeepSeek Harness. v0.1 ships the host-side persona: four behavior rules, a three-level tone setting, and a mutual-exclusion switch with other personas. No game assets, screenshots, or official logos are included. The HUD and the "Hao" score are planned for v0.2.
