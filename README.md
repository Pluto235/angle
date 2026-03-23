# 天使与主人抽签系统

一个基于 Next.js + Prisma + PostgreSQL 的匿名抽签 MVP，支持：

- 用户注册/登录并创建许愿池
- 游客按浏览器身份加入池子
- 名字唯一校验与标准化
- 主人分发、重洗、删除参与者、解锁全部结果
- 参与者在分发后查看自己的纸条

## 本地开发

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 启动 PostgreSQL：

```bash
docker compose up -d db
```

如果本机没有 `docker compose`，可以直接启动一个 PostgreSQL 容器：

```bash
docker run --name angle-pg \
  -e POSTGRES_DB=angle \
  -e POSTGRES_USER=angle \
  -e POSTGRES_PASSWORD=angle \
  -p 5432:5432 \
  -d postgres:16-alpine
```

如果当前环境无法使用 Docker 拉取 PostgreSQL，可以直接使用项目内置的本地 PostgreSQL 兼容服务：

```bash
npm run web:local
```

该命令会启动 PGlite socket server、自动执行 `prisma db push`，然后启动 Web 服务。

3. 推送数据库结构并启动开发环境：

```bash
npm install
npm run db:push
npm run dev
```

4. 打开 `http://localhost:3000`

## 一键启动

```bash
docker compose up --build
```

## 生产环境注意

- 必须修改 `AUTH_SECRET`
- 生产环境如使用 HTTPS，应设置 `COOKIE_SECURE="true"`
- 当前为 MVP，数据库结构通过 `prisma db push` 同步
- 匿名身份依赖浏览器 Cookie，清除后将无法找回纸条
- `npm run web:local` 仅用于本地开发/演示，不替代正式 PostgreSQL 部署
