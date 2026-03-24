"use client";

import Link from "next/link";
import { useState } from "react";

import { DeletePoolButton } from "@/components/DeletePoolButton";
import { formatDateTime, formatStatusLabel } from "@/lib/utils";

type PoolItem = {
  id: string;
  title: string;
  spicyModeEnabled: boolean;
  boomerangModeEnabled: boolean;
  status: "PENDING" | "ASSIGNED" | "INVALIDATED";
  revealAllEnabled: boolean;
  currentRound: number;
  createdAt: string;
  participantCount: number;
};

export function OwnedPoolsList({ initialPools }: { initialPools: PoolItem[] }) {
  const [pools, setPools] = useState(initialPools);

  return (
    <div className="pool-grid">
      {pools.length > 0 ? (
        pools.map((pool) => (
          <article className="pool-card" key={pool.id}>
            <div>
              <h3>{pool.title}</h3>
              <p>
                {formatStatusLabel(pool.status)} · {pool.participantCount} 人 · 第 {Math.max(pool.currentRound, 0)} 轮
                {pool.spicyModeEnabled ? " · 丘比特" : ""}
                {pool.boomerangModeEnabled ? " · 回旋镖" : ""}
              </p>
              <p className="muted-copy">{formatDateTime(new Date(pool.createdAt))}</p>
            </div>
            <div className="button-row">
              <Link className="ghost-link" href={`/pools/${pool.id}`}>
                打开公共页
              </Link>
              <Link className="ghost-link strong-link" href={`/pools/${pool.id}/manage`}>
                管理
              </Link>
              <DeletePoolButton
                poolId={pool.id}
                onDeleted={() => {
                  setPools((current) => current.filter((item) => item.id !== pool.id));
                }}
              />
            </div>
          </article>
        ))
      ) : (
        <p className="muted-copy">你还没有创建任何池子。</p>
      )}
    </div>
  );
}
