import type { UsersRepository } from "../ports";

export type UsersUseCases = {
  listUsers: (page: number, pageSize: number) => Promise<{ items: any[]; total: number }>;
  getUserById: (id: string) => Promise<Record<string, unknown> | null>;
  createUser: (data: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: Date | null;
    role?: "CUSTOMER" | "ADMIN";
    status?: "ACTIVE" | "DISABLED";
  }) => Promise<Record<string, unknown>>;
  updateUser: (id: string, data: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: Date | null;
    role?: "CUSTOMER" | "ADMIN";
    status?: "ACTIVE" | "DISABLED";
  }) => Promise<Record<string, unknown>>;
  disableUser: (id: string) => Promise<Record<string, unknown>>;
  listAddresses: (userId: string) => Promise<any[]>;
  createAddress: (userId: string, data: {
    street: string;
    externalNumber: string;
    internalNumber?: string | null;
    postalCode: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    references?: string | null;
  }) => Promise<Record<string, unknown>>;
  updateAddress: (addressId: string, data: {
    street?: string | null;
    externalNumber?: string | null;
    internalNumber?: string | null;
    postalCode?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    references?: string | null;
  }) => Promise<Record<string, unknown>>;
  findAddress: (addressId: string, userId: string) => Promise<Record<string, unknown> | null>;
  deleteAddress: (addressId: string) => Promise<Record<string, unknown>>;
};

export function createUsersUseCases(deps: { usersRepository: UsersRepository }): UsersUseCases {
  return {
    listUsers: (page, pageSize) => deps.usersRepository.listUsers(page, pageSize),
    getUserById: (id) => deps.usersRepository.getUserById(id),
    createUser: (data) => deps.usersRepository.createUser(data),
    updateUser: (id, data) => deps.usersRepository.updateUser(id, data),
    disableUser: (id) => deps.usersRepository.disableUser(id),
    listAddresses: (userId) => deps.usersRepository.listAddresses(userId),
    createAddress: (userId, data) => deps.usersRepository.createAddress(userId, data),
    updateAddress: (addressId, data) => deps.usersRepository.updateAddress(addressId, data),
    findAddress: (addressId, userId) => deps.usersRepository.findAddress(addressId, userId),
    deleteAddress: (addressId) => deps.usersRepository.deleteAddress(addressId)
  };
}
