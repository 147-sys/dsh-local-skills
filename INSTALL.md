# 安装

## 给人看

### 前置

DSH 0.2.1-rc.3 或更新。无第三方依赖。

### 三选一

**A. GUI（桌面版推荐）**

设置 → 插件 → 安装 → 选本仓库目录 → 重启 DSH。

**B. `dsh plugin`（Web / TUI profile）**

```sh
dsh plugin --profile <profile> add link:<本仓库绝对路径>
```

> 桌面版的 `desktop` profile 由 Electron 独占管理，这条命令会被拒绝，请用 A 或 C。

**C. 手工**

`~/.dsh/profiles/<profile>/package.json` 两处：`dependencies` 加 `"dsh-local-skills": "link:<绝对路径>"`，`dsh.profile.bundles` 加 `"dsh-local-skills"`，然后 `pnpm install --no-frozen-lockfile`，重启。

### 验证

重启后，把任意技能放进 `~/.dsh/skills/<name>/SKILL.md`，在新会话里应当能看到它。

日志里会出现：

```
[dsh-local-skills] scanning C:\Users\<you>\.dsh\skills
```

### 卸载

```sh
dsh plugin --profile <profile> remove dsh-local-skills
```

---

## 给 agent 执行

你负责配置，**不能重启 DSH**。

```powershell
$dshHome = Join-Path $env:USERPROFILE '.dsh'
$profile = 'desktop'
$profDir = Join-Path $dshHome "profiles\$profile"
$plugDir = Join-Path $dshHome 'plugins\dsh-local-skills'
"profile dir   : $(Test-Path $profDir)"
"already there : $(Test-Path $plugDir)"
```

写权限探测：

```powershell
try { New-Item -ItemType Directory -Force -Path (Join-Path $dshHome 'plugins') | Out-Null; "WRITABLE" }
catch { "BLOCKED: $($_.Exception.Message)" }
```

有权限时：

```powershell
Copy-Item -Recurse -Force '<本仓库绝对路径>' $plugDir
```

然后改 profile 的 `package.json` 两处（`dependencies` 的 `link:` + `dsh.profile.bundles` 追加），在 profile 目录跑 `pnpm install --no-frozen-lockfile`，确认：

```powershell
Test-Path (Join-Path $profDir 'node_modules\dsh-local-skills')
```

最后交给人重启，并说明：技能目录是 `~/.dsh/skills`。

无权限时不要绕过沙箱，把两处配置交给人。

### 失败分支

| 现象 | 处理 |
|---|---|
| 重启后技能仍不出现 | 检查 `SKILL.md` 是否有 frontmatter 的 `name` + `description` |
| 日志无 `[dsh-local-skills] scanning` | `bundles` 没写，或没真正重启 |
| `node_modules\dsh-local-skills` 为 False | 在 profile 目录重跑 install |

### 回滚

删两处配置 → 删 `~/.dsh/plugins/dsh-local-skills` → 重启。
