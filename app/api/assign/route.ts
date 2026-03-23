import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { assignPool } from "@/lib/pools";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new AppError("请先登录", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const result = await assignPool(body, user.id);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
