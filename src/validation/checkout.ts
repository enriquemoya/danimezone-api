import { ApiErrors } from "../errors/api-error";

const AVAILABILITY_VALUES = ["in_stock", "low_stock", "out_of_stock", "pending_sync", "unknown"];

function parseNumeric(value: unknown) {
  if (value === null || value === undefined) {
    return Number.NaN;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return Number(normalized);
  }
  return Number(value);
}

export type DraftItemPayload = {
  productId?: unknown;
  quantity?: unknown;
  priceSnapshot?: unknown;
  availabilitySnapshot?: unknown;
};

export function validateDraftItems(payload: unknown) {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiErrors.checkoutInvalid;
  }

  return items.map((item) => {
    const productId = String((item as DraftItemPayload)?.productId ?? "").trim();
    const quantity = Number((item as DraftItemPayload)?.quantity ?? 0);
    const priceSnapshotRaw = (item as DraftItemPayload)?.priceSnapshot;
    const availabilitySnapshotRaw = (item as DraftItemPayload)?.availabilitySnapshot;

    if (!productId || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      throw ApiErrors.checkoutInvalid;
    }

    const priceSnapshot =
      priceSnapshotRaw === null || priceSnapshotRaw === undefined || priceSnapshotRaw === ""
        ? null
        : Number(priceSnapshotRaw);

    if (priceSnapshot !== null && (!Number.isFinite(priceSnapshot) || Number.isNaN(priceSnapshot))) {
      throw ApiErrors.checkoutInvalid;
    }

    const availabilitySnapshot =
      availabilitySnapshotRaw === null || availabilitySnapshotRaw === undefined
        ? null
        : String(availabilitySnapshotRaw).trim();

    if (availabilitySnapshot && !AVAILABILITY_VALUES.includes(availabilitySnapshot)) {
      throw ApiErrors.checkoutInvalid;
    }

    return {
      productId,
      quantity,
      priceSnapshot,
      availabilitySnapshot
    };
  });
}

export function validateRevalidateItems(payload: unknown) {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiErrors.checkoutInvalid;
  }

  return items.map((item) => {
    const productId = String((item as DraftItemPayload)?.productId ?? "").trim();
    const quantity = Number((item as DraftItemPayload)?.quantity ?? 0);

    if (!productId || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      throw ApiErrors.checkoutInvalid;
    }

    return { productId, quantity };
  });
}

export function validateCheckoutOrder(payload: unknown) {
  const draftId = String((payload as { draftId?: unknown })?.draftId ?? "").trim();
  const paymentMethod = String((payload as { paymentMethod?: unknown })?.paymentMethod ?? "").trim();
  const pickupBranchIdRaw = (payload as { pickupBranchId?: unknown })?.pickupBranchId;
  const pickupBranchId =
    pickupBranchIdRaw === null || pickupBranchIdRaw === undefined || pickupBranchIdRaw === ""
      ? null
      : String(pickupBranchIdRaw).trim();

  if (!draftId || paymentMethod !== "PAY_IN_STORE") {
    throw ApiErrors.checkoutInvalid;
  }

  return { draftId, paymentMethod: "PAY_IN_STORE" as const, pickupBranchId };
}

export function validateBranchCreate(payload: unknown) {
  const name = String((payload as { name?: unknown })?.name ?? "").trim();
  const address = String((payload as { address?: unknown })?.address ?? "").trim();
  const city = String((payload as { city?: unknown })?.city ?? "").trim();
  const latitude = parseNumeric((payload as { latitude?: unknown })?.latitude);
  const longitude = parseNumeric((payload as { longitude?: unknown })?.longitude);
  const imageUrlRaw = (payload as { imageUrl?: unknown })?.imageUrl;
  const imageUrl = imageUrlRaw === undefined || imageUrlRaw === null || imageUrlRaw === ""
    ? null
    : String(imageUrlRaw).trim();

  if (!name || !address || !city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw ApiErrors.checkoutInvalid;
  }

  return { name, address, city, latitude, longitude, imageUrl };
}

export function validateBranchUpdate(payload: unknown) {
  const nameRaw = (payload as { name?: unknown })?.name;
  const addressRaw = (payload as { address?: unknown })?.address;
  const cityRaw = (payload as { city?: unknown })?.city;
  const latitudeRaw = (payload as { latitude?: unknown })?.latitude;
  const longitudeRaw = (payload as { longitude?: unknown })?.longitude;
  const imageUrlRaw = (payload as { imageUrl?: unknown })?.imageUrl;

  const data = {
    name: nameRaw === undefined ? undefined : String(nameRaw ?? "").trim(),
    address: addressRaw === undefined ? undefined : String(addressRaw ?? "").trim(),
    city: cityRaw === undefined ? undefined : String(cityRaw ?? "").trim(),
    latitude: latitudeRaw === undefined ? undefined : parseNumeric(latitudeRaw),
    longitude: longitudeRaw === undefined ? undefined : parseNumeric(longitudeRaw),
    imageUrl:
      imageUrlRaw === undefined
        ? undefined
        : imageUrlRaw === null || imageUrlRaw === ""
          ? null
          : String(imageUrlRaw).trim()
  };

  const hasAny = Object.values(data).some((value) => value !== undefined);
  if (!hasAny) {
    throw ApiErrors.checkoutInvalid;
  }

  if (data.name !== undefined && !data.name) {
    throw ApiErrors.checkoutInvalid;
  }
  if (data.address !== undefined && !data.address) {
    throw ApiErrors.checkoutInvalid;
  }
  if (data.city !== undefined && !data.city) {
    throw ApiErrors.checkoutInvalid;
  }
  if (data.latitude !== undefined && !Number.isFinite(data.latitude)) {
    throw ApiErrors.checkoutInvalid;
  }
  if (data.longitude !== undefined && !Number.isFinite(data.longitude)) {
    throw ApiErrors.checkoutInvalid;
  }

  return data;
}
