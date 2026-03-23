import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BROWSER_COOKIE_NAME, shouldUseSecureCookies } from "@/lib/constants";
import { errorResponse } from "@/lib/errors";
import { joinPool } from "@/lib/pools";
import { generateBrowserToken } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(BROWSER_COOKIE_NAME)?.value;

    const browserToken = existingToken ?? generateBrowserToken();
    const participant = await joinPool(body, id, browserToken);

    const response = NextResponse.json({
      ok: true,
      participant,
      notice: "身份保存在当前浏览器，清除后可能丢失",
    });

    if (!existingToken) {
      response.cookies.set({
        name: BROWSER_COOKIE_NAME,
        value: browserToken,
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookies(),
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
