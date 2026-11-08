# Bilibili Great Userscripts Toggle

> 给 AI / 开发者的一句话：这是 [SukkaW/Make-Bilibili-Great-Than-Ever-Before](https://github.com/SukkaW/Make-Bilibili-Great-Than-Ever-Before) 的 **Safari Userscripts 适配分支**。原项目用 `GM.registerMenuCommand` 做开关，Userscripts 不支持该 API；本仓库改成**页内浮动面板 + localStorage** 逐项开关，并提供本机同步上游、构建、安装脚本。按下方「完整部署流程」逐步执行即可在本机跑起来。

## 目录

1. [项目是什么](#1-项目是什么)
2. [与原项目的关系](#2-与原项目的关系)
3. [环境要求](#3-环境要求)
4. [完整部署流程（推荐复制给 AI）](#4-完整部署流程推荐复制给-ai)
5. [安装到 Safari Userscripts](#5-安装到-safari-userscripts)
6. [日常使用](#6-日常使用)
7. [后续更新](#7-后续更新)
8. [常用命令速查](#8-常用命令速查)
9. [仓库结构说明](#9-仓库结构说明)
10. [故障排查](#10-故障排查)
11. [致谢与许可](#11-致谢与许可)

---

## 1. 项目是什么

| 项 | 说明 |
| --- | --- |
| 名称 | Bilibili Great Userscripts Toggle |
| 目标平台 | macOS Safari + [Userscripts](https://github.com/quoid/userscripts) 扩展 |
| 作用站点 | `bilibili.com` / `live.bilibili.com` / `t.bilibili.com` / `space.bilibili.com` 等 |
| 核心改动 | 页内 **BG** 设置面板逐项开关；`@inject-into page`；`unsafeWindow = window` |
| 构建产物 | `dist/bilibili-great-userscripts-toggle.user.js` |
| 当前版本 | 见 `package.json` 的 `version`（形如 `1.10.0-us.2`，`-us.N` 为本分支修订号） |

**本仓库不是原项目的替代品声明，而是兼容 Userscripts 的衍生适配。** 功能模块与上游保持同步；UI / 开关 / 构建元数据为本仓库维护。

---

## 2. 与原项目的关系

| 角色 | 地址 |
| --- | --- |
| **原项目（上游）** | https://github.com/SukkaW/Make-Bilibili-Great-Than-Ever-Before |
| **上游 npm 包** | `make-bilibili-great-than-ever-before` |
| **本仓库（Userscripts 适配）** | https://github.com/824g62zp2p-ai/bilibili-userscripts-toggle |
| **Userscripts 扩展** | https://github.com/quoid/userscripts |

锁定信息写在 `upstream.lock.json`（已同步的上游版本、同步时间等）。

同步时会从上游覆盖：

- `src/modules/`、`src/core/`、大部分 `src/utils/`
- `src/logger.ts`、`src/types.ts`、`eslint.config.js`、`tsconfig.json` 等

**本仓库会保留、不会被覆盖：**

- `src/index.ts`
- `src/ui/`（设置面板）
- `src/utils/module-menu.ts`、`src/utils/settings-store.ts`
- `userscript.meta.json`、`rollup.config.ts`
- `scripts/`

---

## 3. 环境要求

在开始前确认本机具备：

| 依赖 | 最低要求 | 说明 |
| --- | --- | --- |
| 操作系统 | macOS | Userscripts 官方分发面向 Apple 平台 |
| Safari | 系统自带即可 | 需在设置里启用扩展 |
| Userscripts | App Store 安装 | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |
| Node.js | **24**（见 `.node-version`） | 建议用 `fnm` / `nvm` / `asdf` 对齐 |
| pnpm | **12.11.2**（见 `packageManager`） | 推荐：`corepack enable && corepack prepare pnpm@12.11.2 --activate` |
| Git | 任意近期版本 | 克隆本仓库；同步上游时也会 `git clone` |
| 网络 | 可访问 GitHub + npm | `pnpm sync:upstream` 会拉上游标签与 registry |

可选但有用：

- 终端能执行 `pnpm`、`node`、`git`
- 若要把脚本目录指到自定义路径：可写文件的文件夹权限

> Windows / Linux 可以**构建**出 `.user.js`，但本 README 的「装进 Userscripts」步骤面向 Safari。其他管理器（Violentmonkey 等）未作为一等目标测试。

---

## 4. 完整部署流程（推荐复制给 AI）

下面是一份**可顺序执行**的清单。把本仓库 git 地址交给 AI 时，让它严格按步骤做即可。

### 步骤 A — 克隆

```bash
git clone https://github.com/824g62zp2p-ai/bilibili-userscripts-toggle.git
cd bilibili-userscripts-toggle
```

### 步骤 B — 对齐 Node / pnpm

```bash
# 若使用 fnm：
# fnm use

# 或确认版本
node -v    # 建议 v24.x
corepack enable
corepack prepare pnpm@12.11.2 --activate
pnpm -v    # 应为 12.x
```

### 步骤 C — 安装依赖并构建

```bash
pnpm install
pnpm build
```

成功后应出现：

- `dist/bilibili-great-userscripts-toggle.user.js`（正式版，给 Userscripts 用）
- `dist/bilibili-great-userscripts-toggle.debug.user.js`（调试版，**不要**和正式版同时装）

可选自检：

```bash
pnpm smoke
```

### 步骤 D — 安装到 Userscripts

**先做：** 在 Userscripts 里禁用或删除原版 *Make Bilibili Great Than Ever Before*，避免双脚本冲突。

**推荐方式（避开 macOS 容器目录写入限制）：**

1. 打开 macOS 上的 **Userscripts** 应用。
2. 将「脚本保存目录 / Save Directory」设为下面二者之一：
   - 本仓库的 `dist/`
   - 或先运行 `pnpm install:userscripts` 后生成的 `userscripts-out/`
3. 打开一次 Safari 工具栏上的 Userscripts 扩展弹窗，让扩展重新扫描脚本。
4. 确认列表中只有 **Bilibili Great Userscripts Toggle**（正式版），且已启用。

**备选方式（自定义目录）：**

```bash
# 写入可写目录绝对路径（该文件已被 .gitignore，勿提交）
echo "/你的/Userscripts/脚本目录" > .userscripts-path
pnpm install:userscripts
```

也可用环境变量一次性指定：

```bash
USERSCRIPTS_DIR="/你的/Userscripts/脚本目录" pnpm install:userscripts
```

若未配置且无法写入系统容器路径，脚本会回退到仓库内 `userscripts-out/`，并在终端打印提示。

### 步骤 E — 验证

1. Safari 打开任意 B 站页面（例如 `https://www.bilibili.com/`）。
2. 页面右下角应出现 **BG** 按钮。
3. 点击后打开设置面板，可逐项开关功能；切换后页面会自动刷新以生效。
4. 开关状态保存在页面 `localStorage`。

---

## 5. 安装到 Safari Userscripts

### 5.1 一次性准备

1. App Store 安装 Userscripts。
2. `系统设置 → 隐私与安全性 / Safari → 扩展`：启用 Userscripts，并允许相关网站。
3. 不要与上游原版脚本同时启用。

### 5.2 产物文件

| 文件 | 用途 |
| --- | --- |
| `dist/bilibili-great-userscripts-toggle.user.js` | **正式安装文件** |
| `dist/bilibili-great-userscripts-toggle.meta.js` | 元数据（一般不用手装） |
| `dist/*.debug.*` | 仅开发调试；安装脚本会刻意跳过 |

### 5.3 为什么推荐指向 `dist/` / `userscripts-out/`

macOS 常禁止终端直接写入：

`~/Library/Containers/.../Userscripts.../scripts`

因此更稳妥的做法是：让 Userscripts 应用自己「看着」本仓库的输出目录；每次 `pnpm build` / `pnpm release:local` 后打开一次扩展弹窗即可刷新。

---

## 6. 日常使用

- 打开 B 站页面 → 右下角 **BG** → 勾选/取消模块。
- 模块列表与上游一致（均可单独开关），例如：`no-ad`、`no-p2p`、`force-enable-4k`、`thread-ripper`、`optimize-homepage` 等。
- 页内面板也会探测上游 npm 版本；若有更新，会提示在本机运行 `pnpm sync:upstream`。

---

## 7. 后续更新

有两条更新线，不要混淆：

### 7.1 更新「本适配仓库」本身

```bash
cd /path/to/bilibili-userscripts-toggle
git pull
pnpm install
pnpm build
pnpm install:userscripts   # 若你使用复制安装方式
```

然后打开一次 Userscripts 弹窗。

### 7.2 同步「上游 SukkaW 项目」新版本（推荐）

上游出新版时，在本仓库根目录执行：

```bash
# 有新版本才同步；已是最新则只重建
pnpm sync:upstream

# 强制重新拉取并合并（忽略版本比较）
pnpm sync:upstream:force

# 一条龙：同步（如有）→ 构建 → 安装到 Userscripts 目录
pnpm release:local
```

同步脚本会：

1. 读 `upstream.lock.json`
2. 查询 npm 上 `make-bilibili-great-than-ever-before` 最新版
3. 按标签浅克隆上游并合并允许覆盖的路径
4. 保留本仓库适配层，更新版本戳与 lock
5. `pnpm install` + `pnpm build`

### 7.3 可选：定时自动更新

用 `cron` 或 `launchd` 每天执行：

```bash
cd /path/to/bilibili-userscripts-toggle && /opt/homebrew/bin/pnpm release:local
```

请把 `pnpm` 路径改成你机器上的真实路径（`which pnpm`）。

---

## 8. 常用命令速查

```bash
pnpm install                 # 安装依赖
pnpm build                   # 构建 dist/
pnpm smoke                   # 构建 + 离线/联网冒烟检查
pnpm lint                    # ESLint
pnpm sync:upstream           # 按需同步上游
pnpm sync:upstream:force     # 强制同步上游
pnpm install:userscripts     # 复制正式 .user.js 到安装目录
pnpm release:local           # sync + build + install
```

---

## 9. 仓库结构说明

```text
bilibili-userscripts-toggle/
├── README.md                 # 本说明（部署以这里为准）
├── LICENSE                   # MIT（含上游与本分支版权）
├── package.json              # 脚本与依赖；packageManager 锁定 pnpm
├── .node-version             # 建议 Node 主版本
├── upstream.lock.json        # 已锁定的上游版本信息
├── userscript.meta.json      # Userscript 头信息（match / inject-into 等）
├── rollup.config.ts          # 打包；注入 unsafeWindow shim
├── scripts/
│   ├── sync-upstream.mjs     # 上游同步
│   ├── install-to-userscripts.mjs
│   └── smoke-check.mjs
├── src/
│   ├── index.ts              # 入口（本分支保留）
│   ├── ui/                   # 页内设置面板
│   ├── modules/              # 功能模块（主要来自上游）
│   ├── core/                 # 播放器相关（主要来自上游）
│   └── utils/                # 含 settings-store / module-menu（本分支）
└── dist/                     # 构建输出（默认不提交）
```

本地可选、已被忽略的文件：

- `.userscripts-path` — 你的安装目录配置
- `userscripts-out/` — 安装回退目录
- `node_modules/`、`dist/`

---

## 10. 故障排查

| 现象 | 处理 |
| --- | --- |
| 页面没有 **BG** 按钮 | 确认扩展已启用、脚本已启用、已打开匹配的 B 站域名；打开一次 Userscripts 弹窗刷新 |
| 功能开关无效 / 行为怪异 | 检查是否同时启用了上游原版脚本；只保留本仓库产物 |
| `pnpm install` 失败 | 确认 Node 24 + pnpm 12；检查网络与 registry |
| `pnpm sync:upstream` 克隆失败 | 检查 GitHub 访问；确认上游已打对应 npm 版本的 git tag |
| `install:userscripts` 写入失败 | 改用「Userscripts 应用指向 `dist/` / `userscripts-out/`」；或配置可写的 `.userscripts-path` |
| 装了 debug 又装正式版 | 卸掉所有 `*.debug.*`；只保留正式 `.user.js` |
| 播放器 iframe 异常 | 本仓库故意**不**使用 `@noframes`；勿自行加回 |

---

## 11. 致谢与许可

- **上游项目：** [SukkaW/Make-Bilibili-Great-Than-Ever-Before](https://github.com/SukkaW/Make-Bilibili-Great-Than-Ever-Before)
- **更早渊源：** Make Bilibili Great Again
- **Userscripts：** [quoid/userscripts](https://github.com/quoid/userscripts)
- **许可：** MIT — 见 [LICENSE](./LICENSE)

本适配分支保留上游版权声明，并补充本仓库适配层版权。使用即表示你遵守 MIT 条款。
