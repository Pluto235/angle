# 项目概览（Overview）

## 1. 项目目标

基于 `/home/server/angle/work.md`，本项目目标是实现一个可部署、可公开访问的匿名抽签 Web 应用，用于“天使与主人”游戏。核心目标如下：

- 注册用户可创建池子并作为池主参与抽签
- 游客无需注册即可加入池子
- 通过浏览器身份识别游客并查看自己的纸条
- 保证每人分配一个主人且不能抽到自己
- 默认匿名，池主可主动解锁全部结果
- 支持删除参与者、作废当前结果、重新分发/重洗

## 2. 当前技术方案

当前项目已经形成一套可运行的 MVP 技术方案：

- 采用 Next.js App Router 作为前后端一体化框架
- 页面层使用服务端页面 + 客户端交互组件
- 接口层使用 Next.js Route Handlers 暴露 REST 风格 API
- 注册用户通过 JWT Session Cookie 鉴权
- 游客通过浏览器 Cookie 保存匿名身份
- 数据访问通过 Prisma 7 + PostgreSQL adapter 实现
- 部署通过 Dockerfile 与 `docker-compose.yml` 提供基础容器化方案

说明：

- `work.md` 建议前端使用 Tailwind；当前实现采用 Next.js + React + 自定义 CSS，优先保证 MVP 完整可用

## 3. 项目结构

当前项目主要结构如下（已忽略 `node_modules` 等依赖目录）：

```text
angle/
├── app/                  # 页面与 API 路由
│   ├── api/              # 后端接口
│   ├── pools/            # 池子页与管理页
│   ├── layout.tsx        # 全局布局
│   ├── page.tsx          # 首页
│   └── globals.css       # 全局样式
├── components/           # 前端交互组件
├── lib/                  # 鉴权、校验、业务逻辑、Prisma 初始化
├── prisma/               # 数据模型与迁移目录
├── public/               # 静态资源目录（当前为空）
├── work/                 # 工作文档目录
├── Dockerfile            # 应用镜像构建
├── docker-compose.yml    # 本地/部署容器编排
├── prisma.config.ts      # Prisma 7 配置
├── package.json          # 项目依赖与脚本
├── README.md             # 启动与部署说明
├── log.md                # 历史开发日志
└── work.md               # 需求文档
```

## 4. 技术栈

### 前端

- Next.js 16
- React 19
- TypeScript
- 自定义 CSS（`app/globals.css`）

### 后端

- Next.js Route Handlers
- 自定义鉴权逻辑（JWT Session Cookie）

### 数据库

- PostgreSQL
- Prisma 7
- `@prisma/adapter-pg`

### 部署

- Dockerfile
- `docker-compose.yml`

## 5. 核心模块划分

### 用户与鉴权

- 注册/登录
- Session Cookie 管理
- 池主身份校验

### 池子管理

- 创建池子
- 查询池子信息
- 状态维护：`PENDING / ASSIGNED / INVALIDATED`

### 参与者管理

- 游客加入
- 名字唯一校验
- 浏览器身份绑定
- 删除参与者

### 分配逻辑

- 分发
- 重洗/重新分发
- 保证无人抽到自己
- 轮次与旧结果作废

### 结果查看

- 我的纸条
- 全部结果
- 匿名模式与解锁全部结果

### 页面层

- 首页
- 池子页
- 池主管理页

## 6. 数据结构设计

当前数据模型与需求一致，核心表如下：

### users

- 用户基础信息
- 字段：`id`、`username`、`email`、`passwordHash`、`createdAt`

### pools

- 池子主体
- 字段：`id`、`ownerUserId`、`title`、`status`、`revealAllEnabled`、`currentRound`、`createdAt`

### participants

- 参与者列表
- 字段：`id`、`poolId`、`userId`、`displayName`、`normalizedName`、`isOwner`、`browserTokenHash`、`createdAt`、`deletedAt`

### assignments

- 分配结果
- 字段：`id`、`poolId`、`roundNo`、`giverId`、`targetId`、`createdAt`、`invalidatedAt`

### 关键约束

- 池内名字唯一
- 同浏览器在同池只能加入一次
- 分配结果按轮次管理
- 删除参与者后可作废当前轮结果

## 7. 接口设计概览

当前项目实际接口落在 `/api/*` 下，主要包括：

### 鉴权

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### 池子

- `GET /api/pools`
- `POST /api/pools`
- `GET /api/pools/[id]`
- `POST /api/pools/[id]/join`

### 参与者与分发

- `DELETE /api/participants/[id]`
- `POST /api/assign`
- `POST /api/reshuffle`
- `POST /api/reveal-all`

### 结果

- `GET /api/my-slip`
- `GET /api/all-results`

## 8. 当前完成情况

当前已有代码已完成以下内容：

- 项目基础骨架已完成
- Prisma schema 与 PostgreSQL 配置已完成
- 首页、池子页、管理页已实现
- 注册/登录、创建池子、加入池子已实现
- 分发、重洗、删除参与者、解锁全部结果已实现
- “我的纸条”和“全部结果”接口已实现
- Docker 与 README 启动说明已提供
- 历史开发日志已存在于项目根目录 `log.md`

当前文档工作目录 `work/` 已初始化，用于后续维护项目概览和执行日志。

## 9. 下一步开发计划

### 阶段一：联调验证

- 连接真实 PostgreSQL 进行本地联调
- 手工验证完整流程：注册、创建池子、加入、分发、查看纸条、重洗
- 检查状态流转与匿名规则是否完全符合需求

### 阶段二：质量补强

- 增加关键业务测试
- 增加错误场景测试
- 增加示例数据或初始化脚本

### 阶段三：部署完善

- 验证容器化启动流程
- 补充生产环境变量说明
- 视需要增加反向代理或 HTTPS 部署说明
