import { PoolStatus, Prisma } from "@prisma/client";

import { AppError } from "./errors";
import { prisma } from "./prisma";
import {
  confirmActionSchema,
  createPoolSchema,
  joinPoolSchema,
  poolActionSchema,
  sanitizeDisplayName,
  sanitizePoolTitle,
} from "./validation";
import { hashToken, normalizeName } from "./utils";

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type ViewerContext = {
  userId?: string | null;
  browserToken?: string | null;
};

function buildSattoloTargets(participantIds: string[]) {
  const ids = [...participantIds];

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * index);
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }

  return ids;
}

async function getPoolWithParticipants(poolId: string) {
  return prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      participants: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          displayName: true,
          isOwner: true,
          userId: true,
          browserTokenHash: true,
          createdAt: true,
        },
      },
    },
  });
}

async function resolveViewerParticipant(poolId: string, viewer: ViewerContext) {
  if (viewer.userId) {
    const ownerParticipant = await prisma.participant.findFirst({
      where: {
        poolId,
        deletedAt: null,
        isOwner: true,
        userId: viewer.userId,
      },
      select: {
        id: true,
        displayName: true,
        isOwner: true,
        createdAt: true,
      },
    });

    if (ownerParticipant) {
      return ownerParticipant;
    }
  }

  if (!viewer.browserToken) {
    return null;
  }

  const browserTokenHash = hashToken(viewer.browserToken);

  return prisma.participant.findFirst({
    where: {
      poolId,
      deletedAt: null,
      browserTokenHash,
    },
    select: {
      id: true,
      displayName: true,
      isOwner: true,
      createdAt: true,
    },
  });
}

export async function getOwnedPools(userId: string) {
  return prisma.pool.findMany({
    where: { ownerUserId: userId },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      status: true,
      revealAllEnabled: true,
      currentRound: true,
      createdAt: true,
      _count: {
        select: {
          participants: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
}

export async function createPool(input: unknown, userId: string) {
  const parsed = createPoolSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "创建池子参数错误");
  }

  const title = sanitizePoolTitle(parsed.data.title);
  const ownerDisplayName = sanitizeDisplayName(parsed.data.ownerDisplayName);

  return prisma.$transaction(async (tx) => {
    const pool = await tx.pool.create({
      data: {
        title,
        ownerUserId: userId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    await tx.participant.create({
      data: {
        poolId: pool.id,
        userId,
        displayName: ownerDisplayName,
        normalizedName: normalizeName(ownerDisplayName),
        isOwner: true,
      },
    });

    return pool;
  });
}

export async function joinPool(input: unknown, poolId: string, browserToken: string) {
  const parsed = joinPoolSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "加入参数错误");
  }

  const displayName = sanitizeDisplayName(parsed.data.displayName);
  const normalizedName = normalizeName(displayName);
  const browserTokenHash = hashToken(browserToken);

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.status !== PoolStatus.PENDING) {
    throw new AppError("分发后禁止新加入", 409, "POOL_LOCKED");
  }

  const existingBrowserJoin = await prisma.participant.findFirst({
    where: {
      poolId,
      browserTokenHash,
    },
    select: {
      id: true,
    },
  });

  if (existingBrowserJoin) {
    throw new AppError("当前浏览器在这个池子里只能加入一次", 409, "BROWSER_ALREADY_JOINED");
  }

  try {
    return await prisma.participant.create({
      data: {
        poolId,
        displayName,
        normalizedName,
        browserTokenHash,
      },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("名字重复，请换一个名字", 409, "DISPLAY_NAME_TAKEN");
    }

    throw error;
  }
}

export async function deleteParticipant(participantId: string, requesterUserId: string) {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    include: {
      pool: {
        select: {
          id: true,
          ownerUserId: true,
          status: true,
          currentRound: true,
        },
      },
    },
  });

  if (!participant || participant.deletedAt) {
    throw new AppError("参与者不存在", 404, "PARTICIPANT_NOT_FOUND");
  }

  if (participant.pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可删除参与者", 403, "FORBIDDEN");
  }

  if (participant.isOwner) {
    throw new AppError("不能删除池主自己", 409, "OWNER_CANNOT_BE_REMOVED");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.participant.update({
      where: { id: participantId },
      data: {
        deletedAt: now,
      },
    });

    if (participant.pool.status === PoolStatus.ASSIGNED) {
      await tx.assignment.updateMany({
        where: {
          poolId: participant.pool.id,
          roundNo: participant.pool.currentRound,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      });

      await tx.pool.update({
        where: { id: participant.pool.id },
        data: {
          status: PoolStatus.INVALIDATED,
          revealAllEnabled: false,
        },
      });
    }

    return {
      ok: true,
      status:
        participant.pool.status === PoolStatus.ASSIGNED
          ? PoolStatus.INVALIDATED
          : participant.pool.status,
    };
  });
}

async function assignRound(poolId: string, requesterUserId: string) {
  const pool = await getPoolWithParticipants(poolId);

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可执行该操作", 403, "FORBIDDEN");
  }

  if (pool.participants.length < 2) {
    throw new AppError("参与人数至少 2 人才能分发", 409, "NOT_ENOUGH_PARTICIPANTS");
  }

  const participantIds = pool.participants.map((participant) => participant.id);
  const targetIds = buildSattoloTargets(participantIds);

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    if (pool.currentRound > 0) {
      await tx.assignment.updateMany({
        where: {
          poolId,
          roundNo: pool.currentRound,
          invalidatedAt: null,
        },
        data: {
          invalidatedAt: now,
        },
      });
    }

    const nextRound = pool.currentRound + 1;

    await tx.assignment.createMany({
      data: participantIds.map((giverId, index) => ({
        poolId,
        roundNo: nextRound,
        giverId,
        targetId: targetIds[index],
      })),
    });

    await tx.pool.update({
      where: { id: poolId },
      data: {
        status: PoolStatus.ASSIGNED,
        currentRound: nextRound,
        revealAllEnabled: false,
      },
    });

    return {
      ok: true,
      roundNo: nextRound,
    };
  });
}

export async function assignPool(input: unknown, requesterUserId: string) {
  const parsed = poolActionSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "分发参数错误");
  }

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: {
      id: true,
      status: true,
      ownerUserId: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可执行该操作", 403, "FORBIDDEN");
  }

  if (pool.status === PoolStatus.ASSIGNED) {
    throw new AppError("当前已分发，请使用重洗功能", 409, "ALREADY_ASSIGNED");
  }

  return assignRound(parsed.data.poolId, requesterUserId);
}

export async function reshufflePool(input: unknown, requesterUserId: string) {
  const parsed = confirmActionSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "重洗参数错误");
  }

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: {
      id: true,
      status: true,
      ownerUserId: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可执行该操作", 403, "FORBIDDEN");
  }

  if (pool.status === PoolStatus.PENDING) {
    throw new AppError("尚未分发，无需重洗", 409, "RESHUFFLE_NOT_AVAILABLE");
  }

  return assignRound(parsed.data.poolId, requesterUserId);
}

export async function revealAll(input: unknown, requesterUserId: string) {
  const parsed = confirmActionSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "解锁参数错误");
  }

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: {
      id: true,
      status: true,
      ownerUserId: true,
      revealAllEnabled: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可执行该操作", 403, "FORBIDDEN");
  }

  if (pool.status !== PoolStatus.ASSIGNED) {
    throw new AppError("只有已分发状态才能解锁全部结果", 409, "REVEAL_NOT_AVAILABLE");
  }

  if (pool.revealAllEnabled) {
    return {
      ok: true,
      revealAllEnabled: true,
    };
  }

  await prisma.pool.update({
    where: { id: parsed.data.poolId },
    data: {
      revealAllEnabled: true,
    },
  });

  return {
    ok: true,
    revealAllEnabled: true,
  };
}

export async function getMySlip(poolId: string, viewer: ViewerContext) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      status: true,
      currentRound: true,
      ownerUserId: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  const participant = await resolveViewerParticipant(poolId, viewer);

  if (!participant) {
    return {
      state: "not_joined" as const,
    };
  }

  if (pool.status === PoolStatus.PENDING) {
    return {
      state: "pending" as const,
      participant,
    };
  }

  if (pool.status === PoolStatus.INVALIDATED) {
    return {
      state: "invalidated" as const,
      participant,
    };
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      poolId,
      roundNo: pool.currentRound,
      giverId: participant.id,
      invalidatedAt: null,
    },
    include: {
      target: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  if (!assignment) {
    return {
      state: "pending" as const,
      participant,
    };
  }

  return {
    state: "assigned" as const,
    participant,
    target: assignment.target,
  };
}

export async function getAllResults(poolId: string, requesterUserId: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      revealAllEnabled: true,
      currentRound: true,
    },
  });

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  if (pool.ownerUserId !== requesterUserId) {
    throw new AppError("仅池主可查看全部结果", 403, "FORBIDDEN");
  }

  if (pool.status !== PoolStatus.ASSIGNED || !pool.revealAllEnabled) {
    throw new AppError("池主尚未解锁全部结果", 409, "RESULTS_LOCKED");
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      poolId,
      roundNo: pool.currentRound,
      invalidatedAt: null,
    },
    include: {
      giver: {
        select: {
          id: true,
          displayName: true,
          createdAt: true,
        },
      },
      target: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return assignments
    .sort((left, right) => left.giver.createdAt.getTime() - right.giver.createdAt.getTime())
    .map((assignment) => ({
      giverId: assignment.giverId,
      giverName: assignment.giver.displayName,
      targetId: assignment.targetId,
      targetName: assignment.target.displayName,
    }));
}

export async function getPoolPageData(poolId: string, viewer: ViewerContext) {
  const pool = await getPoolWithParticipants(poolId);

  if (!pool) {
    throw new AppError("池子不存在", 404, "POOL_NOT_FOUND");
  }

  const viewerParticipant = await resolveViewerParticipant(poolId, viewer);
  const slip = await getMySlip(poolId, viewer);
  const isOwner = Boolean(viewer.userId && viewer.userId === pool.ownerUserId);

  const results =
    isOwner && pool.status === PoolStatus.ASSIGNED && pool.revealAllEnabled
      ? await getAllResults(poolId, pool.ownerUserId)
      : [];

  return {
    pool: {
      id: pool.id,
      title: pool.title,
      status: pool.status,
      revealAllEnabled: pool.revealAllEnabled,
      currentRound: pool.currentRound,
      createdAt: pool.createdAt,
      owner: pool.owner,
      participants: pool.participants,
      participantCount: pool.participants.length,
    },
    viewer: {
      isOwner,
      participant: viewerParticipant,
      canJoin: pool.status === PoolStatus.PENDING && !viewerParticipant,
    },
    slip,
    results,
  };
}
