import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { BROWSER_COOKIE_NAME } from "@/lib/constants";
import { AppError, errorResponse } from "@/lib/errors";
import { getMySlip } from "@/lib/pools";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const poolId = url.searchParams.get("poolId");

    if (!poolId) {
      throw new AppError("缺少 poolId", 400, "POOL_ID_REQUIRED");
    }

    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const browserToken = cookieStore.get(BROWSER_COOKIE_NAME)?.value ?? null;
    const slip = await getMySlip(poolId, {
      userId: user?.id,
      browserToken,
    });

    return NextResponse.json({
      ok: true,
      slip,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
