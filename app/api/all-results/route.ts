import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { getAllResults } from "@/lib/pools";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const poolId = url.searchParams.get("poolId");

    if (!poolId) {
      throw new AppError("缺少 poolId", 400, "POOL_ID_REQUIRED");
    }

    const user = await getCurrentUser();

    if (!user) {
      throw new AppError("请先登录", 401, "UNAUTHORIZED");
    }

    const results = await getAllResults(poolId, user.id);

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
