import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, shouldUseSecureCookies } from "./constants";
import { AppError } from "./errors";
import { prisma } from "./prisma";
import { loginSchema, registerSchema } from "./validation";

type SessionPayload = JWTPayload & {
  userId: string;
  username: string;
  email: string;
};

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-this-before-deploy",
);

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createSessionToken(payload: {
  userId: string;
  username: string;
  email: string;
}) {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const result = await jwtVerify<SessionPayload>(token, secret);
    return result.payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload?.userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  });
}

export async function registerUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "注册参数错误");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const username = parsed.data.username.trim();
  const passwordHash = await hash(parsed.data.password, 10);

  try {
    return await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("用户名或邮箱已存在", 409, "USER_EXISTS");
    }

    throw error;
  }
}

export async function loginUser(input: unknown) {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "登录参数错误");
  }

  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("邮箱或密码错误", 401, "INVALID_CREDENTIALS");
  }

  const matched = await compare(parsed.data.password, user.passwordHash);

  if (!matched) {
    throw new AppError("邮箱或密码错误", 401, "INVALID_CREDENTIALS");
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}
