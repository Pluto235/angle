import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { JoinPoolForm } from "@/components/JoinPoolForm";
import { getCurrentUser } from "@/lib/auth";
import { BROWSER_COOKIE_NAME } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { getPoolPageData } from "@/lib/pools";
import { formatDateTime, formatStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const browserToken = cookieStore.get(BROWSER_COOKIE_NAME)?.value ?? null;

  try {
    const data = await getPoolPageData(id, {
      userId: user?.id,
      browserToken,
    });

    const slipContent =
      data.slip.state === "assigned"
        ? `你的纸条是：${data.slip.target.displayName}`
        : data.slip.state === "invalidated"
          ? "结果已失效，等待池主重新分发。"
          : data.slip.state === "pending"
            ? "还未分发，请等待池主操作。"
            : "你尚未加入当前池子。";

    return (
      <div className="page-stack">
        <section className="hero-card compact-hero">
          <div className="hero-copy">
            <span className="section-tag">池子页</span>
            <h1>{data.pool.title}</h1>
            <p>
              {formatStatusLabel(data.pool.status)} · 当前 {data.pool.participantCount} 人 · 创建于{" "}
              {formatDateTime(data.pool.createdAt)}
            </p>
          </div>
          <div className="hero-rules">
            <article>
              <strong>池主</strong>
              <p>{data.pool.owner.username}</p>
            </article>
            <article>
              <strong>轮次</strong>
              <p>{data.pool.currentRound === 0 ? "尚未开始" : `第 ${data.pool.currentRound} 轮`}</p>
            </article>
            <article>
              <strong>匿名状态</strong>
              <p>{data.pool.revealAllEnabled ? "池主已解锁全部结果" : "默认匿名"}</p>
            </article>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="card">
            <div className="section-head">
              <span className="section-tag">参与者</span>
              <h2>当前名单</h2>
              <p>池子内名字唯一。池主也在名单中，并且必须参与抽签。</p>
            </div>
            <div className="participant-list">
              {data.pool.participants.map((participant) => (
                <article className="participant-row" key={participant.id}>
                  <div>
                    <strong>{participant.displayName}</strong>
                    <p>{participant.isOwner ? "池主" : "参与者"}</p>
                  </div>
                  {data.viewer.participant?.id === participant.id ? <span className="pill">当前身份</span> : null}
                </article>
              ))}
            </div>
          </section>

          {data.viewer.canJoin ? (
            <JoinPoolForm poolId={data.pool.id} />
          ) : (
            <section className="card">
              <div className="section-head">
                <span className="section-tag">当前身份</span>
                <h2>{data.viewer.participant ? `你是 ${data.viewer.participant.displayName}` : "当前不可加入"}</h2>
                <p>
                  {data.viewer.participant
                    ? "身份来自当前浏览器 Cookie。清除后可能无法查看自己的纸条。"
                    : data.pool.status === "PENDING"
                      ? "如果你换了浏览器或清除了 Cookie，系统无法识别你之前的身份。"
                      : "分发后禁止新加入。"}
                </p>
              </div>
              {data.viewer.isOwner ? (
                <Link className="ghost-link strong-link" href={`/pools/${data.pool.id}/manage`}>
                  进入管理页
                </Link>
              ) : null}
            </section>
          )}
        </div>

        <section className="card accent-card">
          <div className="section-head">
            <span className="section-tag">我的纸条</span>
            <h2>{data.slip.state === "assigned" ? "可查看" : "等待中"}</h2>
            <p>{slipContent}</p>
          </div>
          {data.slip.state === "assigned" ? (
            <div className="slip-card">
              <span>你的主人</span>
              <strong>{data.slip.target.displayName}</strong>
            </div>
          ) : (
            <p className="muted-copy">
              {data.slip.state === "not_joined"
                ? "加入后系统会把身份和纸条绑定到当前浏览器。"
                : "当前还没有可用纸条。"}
            </p>
          )}
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
