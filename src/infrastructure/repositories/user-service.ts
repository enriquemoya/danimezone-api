import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";

export async function listUsers(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count()
  ]);

  return { items, total };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: Date | null;
  role?: "CUSTOMER" | "ADMIN";
  status?: "ACTIVE" | "DISABLED";
}) {
  return prisma.user.create({
    data: {
      email: data.email ?? null,
      phone: data.phone ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      birthDate: data.birthDate ?? null,
      role: data.role ?? "CUSTOMER",
      status: data.status ?? "ACTIVE"
    }
  });
}

export async function updateUser(id: string, data: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: Date | null;
  role?: "CUSTOMER" | "ADMIN";
  status?: "ACTIVE" | "DISABLED";
}) {
  return prisma.user.update({ where: { id }, data });
}

export async function disableUser(id: string) {
  return prisma.user.update({ where: { id }, data: { status: "DISABLED" } });
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function createAddress(userId: string, data: {
  street: string;
  externalNumber: string;
  internalNumber?: string | null;
  postalCode: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  references?: string | null;
}) {
  return prisma.address.create({
    data: {
      userId,
      street: data.street,
      externalNumber: data.externalNumber,
      internalNumber: data.internalNumber ?? null,
      postalCode: data.postalCode,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      country: data.country,
      references: data.references ?? null
    }
  });
}

export async function updateAddress(addressId: string, data: {
  street?: string | null;
  externalNumber?: string | null;
  internalNumber?: string | null;
  postalCode?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  references?: string | null;
}) {
  return prisma.address.update({ where: { id: addressId }, data: data as Prisma.AddressUpdateInput });
}

export async function findAddress(addressId: string, userId: string) {
  return prisma.address.findFirst({ where: { id: addressId, userId } });
}

export async function deleteAddress(addressId: string) {
  return prisma.address.delete({ where: { id: addressId } });
}
