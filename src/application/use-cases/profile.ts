import type { ProfileRepository } from "../ports";

export type ProfileUseCases = {
  getProfile: (userId: string) => Promise<Record<string, unknown> | null>;
  updateProfile: (userId: string, payload: {
    user: { firstName?: string | null; lastName?: string | null; phone?: string | null };
    address?: {
      street: string;
      externalNumber: string;
      internalNumber?: string | null;
      postalCode: string;
      neighborhood: string;
      city: string;
      state: string;
      country: string;
      references?: string | null;
    };
  }) => Promise<Record<string, unknown>>;
  updatePassword: (userId: string, password: string) => Promise<void>;
};

export function createProfileUseCases(deps: { profileRepository: ProfileRepository }): ProfileUseCases {
  return {
    getProfile: (userId) => deps.profileRepository.getProfile(userId),
    updateProfile: (userId, payload) => deps.profileRepository.updateProfile(userId, payload),
    updatePassword: (userId, password) => deps.profileRepository.updatePassword(userId, password)
  };
}
