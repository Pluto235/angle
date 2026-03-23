import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { deleteParticipant } from "@/lib/pools";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new AppError("请先登录", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const result = await deleteParticipant(id, user.id);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
