import { NextResponse } from "next/server";

import { applySessionCookie, createSessionToken, loginUser } from "@/lib/auth";
import { errorResponse } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginUser(body);
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    const response = NextResponse.json({
      ok: true,
      user,
    });

    applySessionCookie(response, token);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
