import { createHash, randomBytes, randomUUID } from "node:crypto";

export function collapseSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeName(value: string) {
  return collapseSpaces(value).toLowerCase();
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateBrowserToken() {
  return `${randomUUID()}-${randomBytes(12).toString("hex")}`;
}

export function formatStatusLabel(status: "PENDING" | "ASSIGNED" | "INVALIDATED") {
  if (status === "PENDING") {
    return "待加入";
  }

  if (status === "ASSIGNED") {
    return "已分发";
  }

  return "已作废";
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
