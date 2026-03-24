"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JoinPoolForm } from "@/components/JoinPoolForm";

type Participant = {
  id: string;
  displayName: string;
  isOwner: boolean;
};

type ViewerParticipant = {
  id: string;
  displayName: string;
  isOwner: boolean;
  createdAt: string;
};

type Props = {
  poolId: string;
  spicyModeEnabled: boolean;
  status: "PENDING" | "ASSIGNED" | "INVALIDATED";
  initialParticipants: Participant[];
  initialViewerParticipant: ViewerParticipant | null;
  initialCanJoin: boolean;
  isOwner: boolean;
};

async function fetchPoolState(poolId: string) {
  const response = await fetch(`/api/pools/${poolId}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "刷新失败");
  }

  return payload as {
    pool: {
      participants: Participant[];
    };
    viewer: {
      participant: ViewerParticipant | null;
      canJoin: boolean;
      isOwner: boolean;
    };
  };
}

export function PoolPresencePanel({
  poolId,
  spicyModeEnabled,
  status,
  initialParticipants,
  initialViewerParticipant,
  initialCanJoin,
  isOwner,
}: Props) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [viewerParticipant, setViewerParticipant] = useState(initialViewerParticipant);
  const [canJoin, setCanJoin] = useState(initialCanJoin);

  useEffect(() => {
    let active = true;

    async function refreshState() {
      try {
        const payload = await fetchPoolState(poolId);

        if (!active) {
          return;
        }

        setParticipants(payload.pool.participants);
        setViewerParticipant(payload.viewer.participant);
        setCanJoin(payload.viewer.canJoin);
      } catch {
        // 保持当前展示，下一次轮询再试
      }
    }

    void refreshState();

    const intervalId = window.setInterval(() => {
      void refreshState();
    }, 3000);

    const handleFocus = () => {
      void refreshState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [poolId]);

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="section-head">
          <span className="section-tag">参与者</span>
          <h2>当前名单</h2>
          <p>名字一人一个。</p>
        </div>
        <div className="participant-list">
          {participants.map((participant) => (
            <article className="participant-row" key={participant.id}>
              <div>
                <strong>{participant.displayName}</strong>
              </div>
              {viewerParticipant?.id === participant.id ? <span className="pill">当前身份</span> : null}
            </article>
          ))}
        </div>
      </section>

      {canJoin ? (
        <JoinPoolForm
          poolId={poolId}
          spicyModeEnabled={spicyModeEnabled}
          onJoined={(participant) => {
            setParticipants((current) => {
              if (current.some((item) => item.id === participant.id)) {
                return current;
              }

              return [
                ...current,
                {
                  id: participant.id,
                  displayName: participant.displayName,
                  isOwner: false,
                },
              ];
            });
            setViewerParticipant({
              id: participant.id,
              displayName: participant.displayName,
              isOwner: false,
              createdAt: participant.createdAt,
            });
            setCanJoin(false);
          }}
        />
      ) : (
        <section className="card">
          <div className="section-head">
            <span className="section-tag">当前身份</span>
            <h2>{viewerParticipant ? `你是 ${viewerParticipant.displayName}` : "当前不可加入"}</h2>
            <p>
              {viewerParticipant
                ? "身份保存在当前浏览器。"
                : status === "PENDING"
                  ? spicyModeEnabled
                    ? "可加入，丘比特需选性别。"
                    : "可加入。"
                  : "已锁定。"}
            </p>
          </div>
          {isOwner ? (
            <Link className="ghost-link strong-link" href={`/pools/${poolId}/manage`}>
              进入管理页
            </Link>
          ) : null}
        </section>
      )}
    </div>
  );
}
