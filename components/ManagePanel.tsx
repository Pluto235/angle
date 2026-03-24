"use client";

import { useState } from "react";

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function navigateWithMessage(nextMessage: string, targetUrl: string) {
    setMessage(nextMessage);
    setError(null);
    window.setTimeout(() => {
      window.location.replace(targetUrl);
    }, 350);
  }

  async function handleAssign() {
    setPendingAction("assign");
    setError(null);

    try {
      const payload = await request("/api/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolId }),
      });
      navigateWithMessage(`已分发，第 ${payload.result.roundNo} 轮`, `/pools/${poolId}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "分发失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReshuffle() {
    if (!window.confirm("重洗后旧结果作废，继续？")) {
      return;
    }

    setPendingAction("reshuffle");
    setError(null);

    try {
      const payload = await request("/api/reshuffle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ poolId, confirm: true }),
      });
      navigateWithMessage(`已重洗，第 ${payload.result.roundNo} 轮`, `/pools/${poolId}`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "重洗失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRevealAll() {
    if (!window.confirm("解锁后所有结果可见，继续？")) {
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
      navigateWithMessage("已解锁", `/pools/${poolId}/manage`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "解锁失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteParticipant(participantId: string, displayName: string) {
    if (!window.confirm(`删除 ${displayName} 后结果作废，继续？`)) {
      return;
    }

    setPendingAction(participantId);
    setError(null);

    try {
      await request(`/api/participants/${participantId}`, {
        method: "DELETE",
      });
      navigateWithMessage(`已删除 ${displayName}`, `/pools/${poolId}/manage`);
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
          <h2>管理</h2>
          <p>删人会作废结果。</p>
        </div>
        <div className="button-row">
          {status === "PENDING" || status === "INVALIDATED" ? (
            <button className="primary-button" onClick={() => void handleAssign()} disabled={pendingAction !== null}>
              {pendingAction === "assign" ? "处理中..." : status === "PENDING" ? "分发" : "重分发"}
            </button>
          ) : (
            <button className="primary-button" onClick={() => void handleReshuffle()} disabled={pendingAction !== null}>
              {pendingAction === "reshuffle" ? "处理中..." : "重洗"}
            </button>
          )}
          <button
            className="secondary-button"
            onClick={() => void handleRevealAll()}
            disabled={pendingAction !== null || status !== "ASSIGNED" || revealAllEnabled}
          >
            {pendingAction === "reveal" ? "处理中..." : revealAllEnabled ? "已解锁" : "解锁"}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
      </section>

      <section className="card">
        <div className="section-head">
          <span className="section-tag">参与名单</span>
          <h2>共 {participants.length} 人</h2>
          <p>池主固定保留。</p>
        </div>
        <div className="participant-list">
          {participants.map((participant) => (
            <article className="participant-row" key={participant.id}>
              <div>
                <strong>{participant.displayName}</strong>
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
          <p>{revealAllEnabled ? "当前轮次结果。" : "解锁后查看。"}</p>
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
