import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ManagePanel } from "@/components/ManagePanel";
import { getCurrentUser } from "@/lib/auth";
import { BROWSER_COOKIE_NAME } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { getPoolPageData } from "@/lib/pools";
import { formatDateTime, formatStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const cookieStore = await cookies();
  const browserToken = cookieStore.get(BROWSER_COOKIE_NAME)?.value ?? null;

  try {
    const data = await getPoolPageData(id, {
      userId: user.id,
      browserToken,
    });

    if (!data.viewer.isOwner) {
      redirect(`/pools/${id}`);
    }

    return (
      <div className="page-stack">
        <section className="hero-card compact-hero">
          <div className="hero-copy">
            <span className="section-tag">管理页</span>
            <h1>{data.pool.title}</h1>
            <p>
              {formatStatusLabel(data.pool.status)} · {data.pool.participantCount} 人 · 创建于{" "}
              {formatDateTime(data.pool.createdAt)}
            </p>
          </div>
          <div className="hero-rules">
            <article>
              <strong>当前轮次</strong>
              <p>{data.pool.currentRound === 0 ? "尚未分发" : `第 ${data.pool.currentRound} 轮`}</p>
            </article>
            <article>
              <strong>匿名模式</strong>
              <p>{data.pool.revealAllEnabled ? "已解锁全部结果" : "池主默认不可见"}</p>
            </article>
            <article>
              <strong>公共入口</strong>
              <Link className="ghost-link strong-link" href={`/pools/${data.pool.id}`}>
                查看池子页
              </Link>
            </article>
          </div>
        </section>

        <ManagePanel
          poolId={data.pool.id}
          status={data.pool.status}
          revealAllEnabled={data.pool.revealAllEnabled}
          participants={data.pool.participants.map((participant) => ({
            id: participant.id,
            displayName: participant.displayName,
            isOwner: participant.isOwner,
            createdAt: participant.createdAt.toISOString(),
          }))}
          results={data.results}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
