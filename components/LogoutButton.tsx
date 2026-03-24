"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("退出失败");
      }

      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 0);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "退出失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-stack">
      <button className="secondary-button" onClick={() => void handleLogout()} disabled={pending}>
        {pending ? "退出中..." : "退出"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
