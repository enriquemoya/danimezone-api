import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

function mapBranch(row: {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listBranches() {
  const rows = await prisma.pickupBranch.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return rows.map(mapBranch);
}

export async function createBranch(data: {
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
}) {
  const row = await prisma.pickupBranch.create({
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      imageUrl: data.imageUrl ?? null
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return mapBranch(row);
}

export async function updateBranch(
  id: string,
  data: {
    name?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string | null;
  }
) {
  const row = await prisma.pickupBranch.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
      ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {})
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return mapBranch(row);
}

export async function deleteBranch(id: string) {
  const row = await prisma.pickupBranch.delete({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    }
  });
  return mapBranch(row);
}
