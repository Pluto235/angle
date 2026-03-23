"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function JoinPoolForm({ poolId }: { poolId: string }) {
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
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "加入失败");
      }

      setSuccess("加入成功：身份已保存在当前浏览器，清除后可能丢失");
      startTransition(() => {
        router.refresh();
      });
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
        <h2>提交你的名字</h2>
        <p>同一个池子内名字必须唯一，系统会自动忽略大小写并压缩多余空格。</p>
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
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "加入中..." : "加入并保存浏览器身份"}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </form>
    </section>
  );
}
