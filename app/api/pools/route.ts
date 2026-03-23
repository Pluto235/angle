import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { createPool, getOwnedPools } from "@/lib/pools";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new AppError("请先登录", 401, "UNAUTHORIZED");
    }

    const pools = await getOwnedPools(user.id);

    return NextResponse.json({
      ok: true,
      pools,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new AppError("请先登录后创建池子", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const pool = await createPool(body, user.id);

    return NextResponse.json({
      ok: true,
      pool,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
