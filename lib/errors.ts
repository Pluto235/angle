import { NextResponse } from "next/server";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      ok: false,
      error: "服务器内部错误",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 },
  );
}
