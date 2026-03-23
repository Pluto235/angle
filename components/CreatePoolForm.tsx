"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function CreatePoolForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "创建失败");
      }

      startTransition(() => {
        router.push(`/pools/${payload.pool.id}/manage`);
        router.refresh();
      });
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
        <h2>现在开始组局</h2>
        <p>池主必须参与抽签，所以需要填写你在当前池子中的显示名字。</p>
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
          <input
            name="ownerDisplayName"
            type="text"
            placeholder="这个名字会参与抽签"
            required
            maxLength={24}
          />
        </label>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "创建中..." : "创建池子并进入管理页"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </form>
    </section>
  );
}
