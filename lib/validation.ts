import { z } from "zod";

import { collapseSpaces } from "./utils";

export const registerSchema = z.object({
  username: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 2, "用户名至少 2 个字符")
    .refine((value) => value.length <= 24, "用户名最多 24 个字符"),
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位").max(100, "密码过长"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
});

export const createPoolSchema = z.object({
  title: z
    .string()
    .transform((value) => collapseSpaces(value))
    .refine((value) => value.length >= 2, "池子标题至少 2 个字符")
    .refine((value) => value.length <= 60, "池子标题最多 60 个字符"),
  ownerDisplayName: z
    .string()
    .transform((value) => collapseSpaces(value))
    .refine((value) => value.length >= 1, "请输入你在池中的名字")
    .refine((value) => value.length <= 24, "名字最多 24 个字符"),
});

export const joinPoolSchema = z.object({
  displayName: z
    .string()
    .transform((value) => collapseSpaces(value))
    .refine((value) => value.length >= 1, "请输入名字")
    .refine((value) => value.length <= 24, "名字最多 24 个字符"),
});

export const poolActionSchema = z.object({
  poolId: z.string().min(1, "缺少池子 ID"),
});

export const confirmActionSchema = poolActionSchema.extend({
  confirm: z.literal(true),
});

export function sanitizePoolTitle(value: string) {
  return collapseSpaces(value);
}

export function sanitizeDisplayName(value: string) {
  return collapseSpaces(value);
}
