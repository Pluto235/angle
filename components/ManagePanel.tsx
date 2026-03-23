"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type Participant = {
  id: string;
  displayName: string;
  isOwner: boolean;
  createdAt: string;
};

type Result = {
  giverId: string;
  giverName: string;
  targetId: string;
  targetName: string;
};

type Props = {
  poolId: string;
  status: "PENDING" | "ASSIGNED" | "INVALIDATED";
  revealAllEnabled: boolean;
  participants: Participant[];
  results: Result[];
};

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "操作失败");
  }

  return payload;
}

export function ManagePanel({ poolId, status, revealAllEnabled, participants, results }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    setError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleAssign() {
    setPendingAction("assign");
    setError(null);

    try {
      await request("/api/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolId }),
      });
      refreshWithMessage("分发完成");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "分发失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReshuffle() {
    if (!window.confirm("当前结果将作废，确认继续重洗吗？")) {
      return;
    }

    setPendingAction("reshuffle");
    setError(null);

    try {
      await request("/api/reshuffle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolId, confirm: true }),
      });
      refreshWithMessage("已重洗并重新分发");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "重洗失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevealAll() {
    if (!window.confirm("将破坏匿名性，确认解锁全部结果吗？")) {
      return;
    }

    setPendingAction("reveal");
    setError(null);

    try {
      await request("/api/reveal-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolId, confirm: true }),
      });
      refreshWithMessage("已解锁全部结果");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "解锁失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteParticipant(participantId: string, displayName: string) {
    if (!window.confirm(`删除 ${displayName} 后，当前结果会立即作废。确认继续吗？`)) {
      return;
    }

    setPendingAction(participantId);
    setError(null);

    try {
      await request(`/api/participants/${participantId}`, {
        method: "DELETE",
      });
      refreshWithMessage(`已删除 ${displayName}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "删除失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="manage-layout">
      <section className="card">
        <div className="section-head">
          <span className="section-tag">管理动作</span>
          <h2>控制当前轮次</h2>
          <p>删除参与者会立即作废当前结果。已分发状态下可重洗，重洗会生成新一轮结果。</p>
        </div>
        <div className="button-row">
          {status === "PENDING" || status === "INVALIDATED" ? (
            <button className="primary-button" onClick={() => void handleAssign()} disabled={pendingAction !== null}>
              {pendingAction === "assign" ? "处理中..." : status === "PENDING" ? "开始分发" : "重新分发"}
            </button>
          ) : (
            <button className="primary-button" onClick={() => void handleReshuffle()} disabled={pendingAction !== null}>
              {pendingAction === "reshuffle" ? "处理中..." : "重洗并重新分发"}
            </button>
          )}
          <button
            className="secondary-button"
            onClick={() => void handleRevealAll()}
            disabled={pendingAction !== null || status !== "ASSIGNED" || revealAllEnabled}
          >
            {pendingAction === "reveal" ? "处理中..." : revealAllEnabled ? "已解锁全部结果" : "解锁全部结果"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
      </section>

      <section className="card">
        <div className="section-head">
          <span className="section-tag">参与名单</span>
          <h2>共 {participants.length} 人</h2>
          <p>池主必须保留在名单中，普通参与者可被删除，删除后不能在同一浏览器再次加入。</p>
        </div>
        <div className="participant-list">
          {participants.map((participant) => (
            <article className="participant-row" key={participant.id}>
              <div>
                <strong>{participant.displayName}</strong>
                <p>{participant.isOwner ? "池主" : "参与者"}</p>
              </div>
              {participant.isOwner ? (
                <span className="pill">固定保留</span>
              ) : (
                <button
                  className="danger-button"
                  onClick={() => void handleDeleteParticipant(participant.id, participant.displayName)}
                  disabled={pendingAction !== null}
                >
                  {pendingAction === participant.id ? "删除中..." : "删除"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <span className="section-tag">全部结果</span>
          <h2>{revealAllEnabled ? "已解锁" : "默认匿名"}</h2>
          <p>{revealAllEnabled ? "以下是当前轮次全部配对。" : "池主默认看不到全部结果，需主动解锁后才会展示。"}</p>
        </div>
        {revealAllEnabled ? (
          <div className="result-list">
            {results.map((result) => (
              <article className="result-row" key={result.giverId}>
                <strong>{result.giverName}</strong>
                <span>→</span>
                <strong>{result.targetName}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-copy">当前未展示全部结果。</p>
        )}
      </section>
    </div>
  );
}
