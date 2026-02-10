import type { BranchRepository } from "../ports";

export type BranchUseCases = {
  listBranches: () => Promise<Array<Record<string, unknown>>>;
  createBranch: (data: {
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    imageUrl?: string | null;
  }) => Promise<Record<string, unknown>>;
  updateBranch: (id: string, data: {
    name?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string | null;
  }) => Promise<Record<string, unknown> | null>;
  deleteBranch: (id: string) => Promise<Record<string, unknown> | null>;
};

export function createBranchUseCases(deps: { branchRepository: BranchRepository }): BranchUseCases {
  return {
    listBranches: () => deps.branchRepository.listBranches(),
    createBranch: (data) => deps.branchRepository.createBranch(data),
    updateBranch: (id, data) => deps.branchRepository.updateBranch(id, data),
    deleteBranch: (id) => deps.branchRepository.deleteBranch(id)
  };
}
