import { AuthPanel } from "@/components/AuthPanel";
import { CreatePoolForm } from "@/components/CreatePoolForm";
import { OwnedPoolsList } from "@/components/OwnedPoolsList";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedPools } from "@/lib/pools";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const pools = user ? await getOwnedPools(user.id) : [];

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="section-tag">MVP</span>
          <h1>匿名抽签</h1>
          <p>建池、加入、分发、查看。</p>
        </div>
        <div className="hero-rules">
          <article>
            <strong>名字唯一</strong>
            <p>自动忽略大小写。</p>
          </article>
          <article>
            <strong>同浏览器一次</strong>
            <p>清 Cookie 可能找不回。</p>
          </article>
          <article>
            <strong>分发后锁定</strong>
            <p>删除会作废结果。</p>
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
            <LogoutButton />
          </section>
          <CreatePoolForm />
        </div>
      ) : (
        <AuthPanel />
      )}

      <section className="card">
        <div className="section-head">
          <span className="section-tag">我的池子</span>
          <h2>{user ? "我的池子" : "登录后创建池子"}</h2>
          <p>{user ? "点卡片进入。" : "先注册或登录。"}</p>
        </div>
        {user ? (
          <OwnedPoolsList
            initialPools={pools.map((pool) => ({
              id: pool.id,
              title: pool.title,
              spicyModeEnabled: pool.spicyModeEnabled,
              boomerangModeEnabled: pool.boomerangModeEnabled,
              status: pool.status,
              revealAllEnabled: pool.revealAllEnabled,
              currentRound: pool.currentRound,
              createdAt: pool.createdAt.toISOString(),
              participantCount: pool.participantCount,
            }))}
          />
        ) : (
          <p className="muted-copy">先注册，再创建。</p>
        )}
      </section>
    </div>
  );
}
