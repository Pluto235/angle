## 2026-03-23 16:06 初始化
- 完成：
  - 创建 work 目录
  - 创建 overview.md
  - 创建 log.md
  - 生成项目概览文档
- 修改文件：
  - work/overview.md
  - work/log.md
- 说明：
  初始化项目文档结构
- 下一步：
  开始具体开发实现

## 2026-03-23 16:37
- 完成：
  - 复查项目当前能力与启动说明
  - 执行 `npm run build` 验证当前代码可生产构建
  - 整理当前可用状态与使用方式
- 修改文件：
  - work/log.md
- 说明：
  当前构建通过，可进入本地运行和联调阶段
- 下一步：
  启动 PostgreSQL，执行 `npm run db:push` 和 `npm run dev` 进行实际功能使用

## 2026-03-23 16:46
- 完成：
  - 检查运行环境
  - 确认 Docker 可用、数据库未启动、`.env` 尚未创建、3000/5432 端口空闲
- 修改文件：
  - work/log.md
- 说明：
  准备进入实际服务启动阶段
- 下一步：
  创建 `.env`，启动 PostgreSQL，推送数据库结构并启动 Web 服务

## 2026-03-23 16:50
- 完成：
  - 新增无 Docker 本地启动脚本 `npm run web:local`
  - 调整 Prisma 连接池为可配置
  - 补充 README 本地网页启动说明
- 修改文件：
  - package.json
  - lib/prisma.ts
  - scripts/web-local.sh
  - README.md
  - .gitignore
  - work/log.md
- 说明：
  为当前环境增加 PGlite 本地 PostgreSQL 兼容运行方案
- 下一步：
  启动本地数据库兼容服务和 Web 服务，验证网页可访问

## 2026-03-23 17:00
- 完成：
  - 新增 PGlite 本地数据库初始化脚本和自定义 socket 启动脚本
  - 修复本地 HTTP 环境下 Cookie `Secure` 导致浏览器无法保持登录态的问题
  - 实测通过：首页 200、注册/登录成功、创建池子成功
- 修改文件：
  - scripts/init-pglite-db.mjs
  - scripts/start-pglite-socket.mjs
  - scripts/web-local.sh
  - lib/constants.ts
  - lib/auth.ts
  - app/api/pools/[id]/join/route.ts
  - .env
  - .env.example
  - README.md
  - work/log.md
- 说明：
  当前可通过网页访问本地服务，且核心登录与建池链路已打通
- 下一步：
  继续做浏览器端完整流程验收，并视需要补一键公网访问或反向代理

## 2026-03-23 17:10
- 完成：
  - 排查远程访问失败原因，确认应用已监听 `*:3000`
  - 确认服务器 `ufw` 默认拒绝入站且未放行 `3000/tcp`
  - 新增 `3000/tcp` 入站规则并复查生效
- 修改文件：
  - work/log.md
- 说明：
  当前服务端口已对外放行，服务器本机访问 `http://10.148.240.220:3000` 返回 200
- 下一步：
  从校园网其他设备复测连通性；若仍失败，继续排查上游网络策略或客户端隔离

## 2026-03-23 23:28
- 完成：
  - 核对当前池子加入流程和页面入口
  - 确认队员应通过池子公共页加入，管理页不用于邀请
- 修改文件：
  - work/log.md
- 说明：
  当前加入逻辑依赖浏览器 Cookie 保存参与者身份
- 下一步：
  向使用者说明正确的邀请链接和加入注意事项

## 2026-03-24 01:10
- 完成：
  - 初始化项目 Git 仓库
  - 配置 GitHub 远端并准备首推
- 修改文件：
  - work/log.md
- 说明：
  当前目录此前不是 Git 仓库，已整理为可提交状态
- 下一步：
  提交当前项目并推送到 GitHub 远端

## 2026-03-24 01:12
- 完成：
  - 提交当前项目代码
  - 推送 `main` 分支到 GitHub 远端
- 修改文件：
  - work/log.md
- 说明：
  远端 `origin` 已建立并跟踪 `main`
- 下一步：
  继续按日志规范进行后续开发与提交
