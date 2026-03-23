import Link from "next/link";

import { AuthPanel } from "@/components/AuthPanel";
import { CreatePoolForm } from "@/components/CreatePoolForm";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedPools } from "@/lib/pools";
import { formatDateTime, formatStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const pools = user ? await getOwnedPools(user.id) : [];

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-tag">MVP</span>
          <h1>匿名抽签，先保密，必要时再由池主解锁全部结果。</h1>
          <p>
            注册用户创建池子并自动参抽，普通用户无需注册，通过当前浏览器身份加入并查看自己的纸条。
          </p>
        </div>
        <div className="hero-rules">
          <article>
            <strong>规则 01</strong>
            <p>每个池子内名字唯一，系统自动忽略大小写并压缩多余空格。</p>
          </article>
          <article>
            <strong>规则 02</strong>
            <p>一台浏览器在一个池子里只能加入一次，清除 Cookie 后可能找不回纸条。</p>
          </article>
          <article>
            <strong>规则 03</strong>
            <p>分发后不允许新加入，删除参与者会立即作废当前结果。</p>
          </article>
        </div>
      </section>

      {user ? (
        <div className="dashboard-grid">
          <section className="card">
            <div className="section-head">
              <span className="section-tag">当前登录</span>
              <h2>{user.username}</h2>
              <p>{user.email}</p>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="secondary-button" type="submit">
                退出登录
              </button>
            </form>
          </section>
          <CreatePoolForm />
        </div>
      ) : (
        <AuthPanel />
      )}

      <section className="card">
        <div className="section-head">
          <span className="section-tag">我的池子</span>
          <h2>{user ? "继续管理你创建的池子" : "登录后可创建和管理池子"}</h2>
          <p>{user ? "点击任一池子进入公共页或管理页。" : "当前未登录，先注册或登录池主账号。"}</p>
        </div>
        {user ? (
          <div className="pool-grid">
            {pools.length > 0 ? (
              pools.map((pool) => (
                <article className="pool-card" key={pool.id}>
                  <div>
                    <h3>{pool.title}</h3>
                    <p>
                      {formatStatusLabel(pool.status)} · {pool._count.participants} 人 · 第 {Math.max(pool.currentRound, 0)} 轮
                    </p>
                    <p className="muted-copy">{formatDateTime(pool.createdAt)}</p>
                  </div>
                  <div className="button-row">
                    <Link className="ghost-link" href={`/pools/${pool.id}`}>
                      打开公共页
                    </Link>
                    <Link className="ghost-link strong-link" href={`/pools/${pool.id}/manage`}>
                      管理
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted-copy">你还没有创建任何池子。</p>
            )}
          </div>
        ) : (
          <p className="muted-copy">创建池子需要注册并登录。</p>
        )}
      </section>
    </div>
  );
}
