import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PoolPresencePanel } from "@/components/PoolPresencePanel";
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
          ? "结果已失效"
          : data.slip.state === "pending"
            ? "等待分发"
            : "未加入";

    return (
      <div className="page-stack">
        <section className="hero-card compact-hero">
          <div className="hero-copy">
            <span className="section-tag">池子页</span>
            <h1>{data.pool.title}</h1>
            <p>
              {formatStatusLabel(data.pool.status)} · 当前 {data.pool.participantCount} 人
              {data.pool.spicyModeEnabled ? " · 丘比特" : ""}
              {data.pool.boomerangModeEnabled ? " · 回旋镖" : ""} · 创建于{" "}
              {formatDateTime(data.pool.createdAt)}
            </p>
            {data.viewer.isOwner ? <CopyLinkButton /> : null}
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
              <p>{data.pool.revealAllEnabled ? "已解锁" : "默认匿名"}</p>
            </article>
          </div>
        </section>

        <PoolPresencePanel
          poolId={data.pool.id}
          spicyModeEnabled={data.pool.spicyModeEnabled}
          status={data.pool.status}
          initialParticipants={data.pool.participants.map((participant) => ({
            id: participant.id,
            displayName: participant.displayName,
            isOwner: participant.isOwner,
          }))}
          initialViewerParticipant={
            data.viewer.participant
              ? {
                  id: data.viewer.participant.id,
                  displayName: data.viewer.participant.displayName,
                  isOwner: data.viewer.participant.isOwner,
                  createdAt: data.viewer.participant.createdAt.toISOString(),
                }
              : null
          }
          initialCanJoin={data.viewer.canJoin}
          isOwner={data.viewer.isOwner}
        />

        <section className="card accent-card">
          <div className="section-head">
            <span className="section-tag">我的纸条</span>
            <h2>{data.slip.state === "assigned" ? "可查看" : "等待中"}</h2>
            <p>{slipContent}</p>
          </div>
          {data.slip.state === "assigned" ? (
            <div className="slip-card">
              <strong>{data.slip.target.displayName}</strong>
            </div>
          ) : (
            <p className="muted-copy">{data.slip.state === "not_joined" ? "先加入池子。" : "暂无结果。"}</p>
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
