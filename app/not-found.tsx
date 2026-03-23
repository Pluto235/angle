import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <section className="card">
        <div className="section-head">
          <span className="section-tag">404</span>
          <h1>池子不存在</h1>
          <p>请检查链接是否正确，或返回首页重新进入。</p>
        </div>
        <Link className="ghost-link strong-link" href="/">
          返回首页
        </Link>
      </section>
    </div>
  );
}
