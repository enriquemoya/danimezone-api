import { ApiErrors } from "../errors/api-error";

export function validateInventoryAdjustment(payload: unknown) {
  const delta = Number((payload as { delta?: unknown })?.delta);
  const reason = String((payload as { reason?: string })?.reason ?? "").trim();

  if (!Number.isFinite(delta) || Number.isNaN(delta)) {
    throw ApiErrors.inventoryInvalid;
  }

  if (!Number.isInteger(delta)) {
    throw ApiErrors.inventoryInvalid;
  }

  if (!reason) {
    throw ApiErrors.inventoryInvalid;
  }

  return { delta, reason };
}
