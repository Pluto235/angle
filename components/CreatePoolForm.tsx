"use client";

import { useState } from "react";

export function CreatePoolForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [spicyModeEnabled, setSpicyModeEnabled] = useState(false);
  const [boomerangModeEnabled, setBoomerangModeEnabled] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          ownerDisplayName: String(formData.get("ownerDisplayName") ?? ""),
          spicyModeEnabled,
          boomerangModeEnabled,
          ownerGender: formData.get("ownerGender") ? String(formData.get("ownerGender")) : undefined,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "创建失败");
      }

      window.location.assign(`/pools/${payload.pool.id}`);
      return;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card accent-card">
      <div className="section-head">
        <span className="section-tag">创建池子</span>
        <h2>创建池子</h2>
        <p>{spicyModeEnabled ? "开丘比特后需选性别。" : "池主也会参与抽签。"}</p>
      </div>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <label className="field">
          <span>池子标题</span>
          <input name="title" type="text" placeholder="例如：2026 春季天使与主人" required maxLength={60} />
        </label>
        <label className="field">
          <span>你在池中的名字</span>
          <input name="ownerDisplayName" type="text" placeholder="会参与抽签" required maxLength={24} />
        </label>
        <div className="mode-grid">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={spicyModeEnabled}
              onChange={(event) => {
                setSpicyModeEnabled(event.target.checked);
              }}
            />
            <span>丘比特</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={boomerangModeEnabled}
              onChange={(event) => {
                setBoomerangModeEnabled(event.target.checked);
              }}
            />
            <span>回旋镖</span>
          </label>
        </div>
        {spicyModeEnabled ? (
          <fieldset className="field choice-field">
            <span>池主性别</span>
            <div className="choice-grid choice-grid-compact">
              <label className="choice-chip">
                <input name="ownerGender" type="radio" value="MALE" required />
                <span>男生</span>
              </label>
              <label className="choice-chip">
                <input name="ownerGender" type="radio" value="FEMALE" required />
                <span>女生</span>
              </label>
            </div>
          </fieldset>
        ) : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "创建中..." : "创建池子"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </section>
  );
}
