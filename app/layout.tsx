import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "天使与主人抽签系统",
  description: "匿名抽签 Web 应用，支持创建池子、参与者加入、分发与重洗。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <Link className="brand-mark" href="/">
              <span className="brand-kicker">ANGLE</span>
              <strong>天使与主人</strong>
            </Link>
            <p className="brand-copy">匿名抽签工具</p>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
