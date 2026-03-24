"use client";

import { useState } from "react";

async function requestDelete(poolId: string) {
  const response = await fetch(`/api/pools/${poolId}`, {
    method: "DELETE",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "删除失败");
  }
}

export function DeletePoolButton({
  poolId,
  onDeleted,
}: {
  poolId: string;
  onDeleted?: (poolId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("删除后无法恢复，确认删除这个池子吗？")) {
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await requestDelete(poolId);
      setMessage("已删除");
      window.setTimeout(() => {
        if (onDeleted) {
          onDeleted(poolId);
          return;
        }

        window.location.reload();
      }, 900);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pool-delete-wrap">
      <button
        className="danger-button pool-delete-button"
        type="button"
        onClick={() => void handleDelete()}
        disabled={pending}
      >
        {pending ? "删除中..." : "删除"}
      </button>
      {message ? <span className="pool-delete-message">{message}</span> : null}
      {error ? <span className="pool-delete-error">{error}</span> : null}
    </div>
  );
}
