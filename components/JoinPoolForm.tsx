"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinPoolForm({
  poolId,
  spicyModeEnabled,
  onJoined,
}: {
  poolId: string;
  spicyModeEnabled: boolean;
  onJoined?: (participant: {
    id: string;
    displayName: string;
    createdAt: string;
  }) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/pools/${poolId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: String(formData.get("displayName") ?? ""),
          gender: formData.get("gender") ? String(formData.get("gender")) : undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "加入失败");
      }

      setSuccess("加入成功，身份已保存在当前浏览器。");
      if (payload?.participant) {
        onJoined?.({
          id: String(payload.participant.id),
          displayName: String(payload.participant.displayName),
          createdAt: String(payload.participant.createdAt),
        });
      }
      window.setTimeout(() => {
        router.refresh();
      }, 250);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "加入失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <div className="section-head">
        <span className="section-tag">加入池子</span>
        <h2>加入池子</h2>
        <p>{spicyModeEnabled ? "名字唯一，丘比特需选性别。" : "名字要唯一。"}</p>
      </div>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <label className="field">
          <span>显示名字</span>
          <input name="displayName" type="text" placeholder="例如：Momo" required maxLength={24} />
        </label>
        {spicyModeEnabled ? (
          <fieldset className="field choice-field">
            <span>性别</span>
            <div className="choice-grid choice-grid-compact">
              <label className="choice-chip">
                <input name="gender" type="radio" value="MALE" required />
                <span>男生</span>
              </label>
              <label className="choice-chip">
                <input name="gender" type="radio" value="FEMALE" required />
                <span>女生</span>
              </label>
            </div>
          </fieldset>
        ) : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "加入中..." : "加入"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </form>
    </section>
  );
}
