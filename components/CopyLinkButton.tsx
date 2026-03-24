"use client";

import { useState } from "react";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error("复制失败");
  }
}

export function CopyLinkButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCopy() {
    setPending(true);
    setMessage(null);

    try {
      await copyText(window.location.href);
      setMessage("已复制");
      window.setTimeout(() => {
        setMessage(null);
      }, 1600);
    } catch {
      setMessage("复制失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="copy-link-wrap">
      <button className="secondary-button copy-link-button" onClick={() => void handleCopy()} disabled={pending}>
        {pending ? "复制中..." : "复制链接"}
      </button>
      {message ? <span className="copy-link-message">{message}</span> : null}
    </div>
  );
}
