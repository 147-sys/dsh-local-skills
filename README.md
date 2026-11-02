# dsh-local-skills

把用户级 DSH 技能（`~/.dsh/skills`）注册进会话技能目录。

- **零依赖** —— 只用 `node:fs` / `node:os` / `node:path`
- **目录即技能** —— 含 `SKILL.md` 的目录自动注册
- **可覆盖扫描目录** —— `DSH_LOCAL_SKILL_DIRS`，多目录按顺序优先

## 为什么需要它

在部分 DSH 部署里，放在 `~/.dsh/skills` 的技能不会出现在会话的技能列表中：

- skills-manager 拒绝对原生 `dsh` 根做逐技能策略（`error.root.readonly`）；
- 它的候选构建器在没有策略覆盖时会跳过原生根的技能。

通过 bundle provider 注册目录，是当前可用的机制。

## 它做什么

1. 扫描 `$DSH_HOME/skills`（可用 `DSH_LOCAL_SKILL_DIRS` 覆盖）；
2. 找出含 `SKILL.md` 的目录型技能；
3. 解析 frontmatter 里的 `name` 与 `description`；
4. 以 `provider: dsh-local-skills`、`rank: 400` 注册给技能注册表。

同名技能先出现的目录胜出；rank 400 与原生用户根一致，不会压过项目内副本。

## 配置

| 变量 | 作用 |
|---|---|
| `DSH_HOME` | 默认 `~/.dsh`；技能目录是其下的 `skills` |
| `DSH_LOCAL_SKILL_DIRS` | 覆盖扫描目录，`;` 或 `,` 分隔多个 |

技能目录结构：

```
~/.dsh/skills/<skill-name>/SKILL.md
```

`SKILL.md` 需要 YAML frontmatter，至少含 `name` 与 `description`：

```markdown
---
name: my-skill
description: 一句话说明这个技能做什么。
---

正文……
```

## 安装

见 [INSTALL.md](INSTALL.md)。

## 依赖

零运行时依赖，只用 `node:fs`、`node:os`、`node:path`。

## 隐私

见 [PRIVACY.md](PRIVACY.md)。

## License

MIT
