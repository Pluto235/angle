import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { BROWSER_COOKIE_NAME } from "@/lib/constants";
import { errorResponse } from "@/lib/errors";
import { getPoolPageData } from "@/lib/pools";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const browserToken = cookieStore.get(BROWSER_COOKIE_NAME)?.value ?? null;

    const data = await getPoolPageData(id, {
      userId: user?.id,
      browserToken,
    });

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
