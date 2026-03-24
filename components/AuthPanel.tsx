"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  error: string | null;
  success: string | null;
};

const initialState: FormState = {
  error: null,
  success: null,
};

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? "请求失败");
  }

  return payload;
}

export function AuthPanel() {
  const router = useRouter();
  const [registerState, setRegisterState] = useState<FormState>(initialState);
  const [loginState, setLoginState] = useState<FormState>(initialState);
  const [pending, setPending] = useState<"register" | "login" | null>(null);

  async function handleRegister(formData: FormData) {
    setPending("register");
    setRegisterState(initialState);

    try {
      await postJson("/api/auth/register", {
        username: String(formData.get("username") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      setRegisterState({
        error: null,
        success: "注册并登录成功",
      });
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 0);
    } catch (error) {
      setRegisterState({
        error: error instanceof Error ? error.message : "注册失败",
        success: null,
      });
    } finally {
      setPending(null);
    }
  }

  async function handleLogin(formData: FormData) {
    setPending("login");
    setLoginState(initialState);

    try {
      await postJson("/api/auth/login", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      setLoginState({
        error: null,
        success: "登录成功",
      });
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 0);
    } catch (error) {
      setLoginState({
        error: error instanceof Error ? error.message : "登录失败",
        success: null,
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="auth-grid">
      <section className="card">
        <div className="section-head">
          <span className="section-tag">注册</span>
          <h2>注册</h2>
          <p>注册后可建池。</p>
        </div>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRegister(new FormData(event.currentTarget));
          }}
        >
          <label className="field">
            <span>用户名</span>
            <input name="username" type="text" placeholder="例如：Alice" required maxLength={24} />
          </label>
          <label className="field">
            <span>邮箱</span>
            <input name="email" type="email" placeholder="owner@example.com" required />
          </label>
          <label className="field">
            <span>密码</span>
            <input name="password" type="password" placeholder="至少 6 位" required minLength={6} />
          </label>
          <button className="primary-button" type="submit" disabled={pending === "register"}>
            {pending === "register" ? "注册中..." : "注册"}
          </button>
          {registerState.error ? <p className="error-text">{registerState.error}</p> : null}
          {registerState.success ? <p className="success-text">{registerState.success}</p> : null}
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <span className="section-tag">登录</span>
          <h2>登录</h2>
          <p>登录后可管理池子。</p>
        </div>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin(new FormData(event.currentTarget));
          }}
        >
          <label className="field">
            <span>邮箱</span>
            <input name="email" type="email" placeholder="owner@example.com" required />
          </label>
          <label className="field">
            <span>密码</span>
            <input name="password" type="password" placeholder="输入你的密码" required />
          </label>
          <button className="secondary-button" type="submit" disabled={pending === "login"}>
            {pending === "login" ? "登录中..." : "登录"}
          </button>
          {loginState.error ? <p className="error-text">{loginState.error}</p> : null}
          {loginState.success ? <p className="success-text">{loginState.success}</p> : null}
        </form>
      </section>
    </div>
  );
}
