import { ApiErrors } from "../errors/api-error";
import { isUuid } from "./common";

const TAXONOMY_TYPES = ["CATEGORY", "GAME", "EXPANSION", "OTHER"] as const;
type TaxonomyType = typeof TAXONOMY_TYPES[number];
type TaxonomyLabels = { es: string | null; en: string | null };
const AVAILABILITY_STATES = ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK", "PENDING_SYNC"] as const;
type AvailabilityState = typeof AVAILABILITY_STATES[number];

function parseLabels(value: unknown): TaxonomyLabels | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const es = candidate.es === null || candidate.es === undefined ? null : String(candidate.es).trim();
  const en = candidate.en === null || candidate.en === undefined ? null : String(candidate.en).trim();
  if (es === null && en === null) {
    return null;
  }
  return {
    es: es ? es : null,
    en: en ? en : null
  };
}

function parseReleaseDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw ApiErrors.taxonomyInvalid;
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw ApiErrors.taxonomyInvalid;
  }
  return parsed;
}

export function validateTaxonomyCreate(payload: unknown) {
  const type = String((payload as { type?: string })?.type ?? "").toUpperCase();
  const name = String((payload as { name?: string })?.name ?? "").trim();
  const slug = String((payload as { slug?: string })?.slug ?? "").trim();
  const description = String((payload as { description?: string })?.description ?? "").trim();
  const parentId = (payload as { parentId?: unknown })?.parentId;
  const releaseDate = parseReleaseDate((payload as { releaseDate?: unknown })?.releaseDate);
  const labels = parseLabels((payload as { labels?: unknown })?.labels);

  if (!TAXONOMY_TYPES.includes(type as TaxonomyType)) {
    throw ApiErrors.taxonomyInvalid;
  }
  if (!name || !slug) {
    throw ApiErrors.taxonomyInvalid;
  }
  const parentValue = parentId === undefined || parentId === null || parentId === ""
    ? null
    : String(parentId).trim();
  if (parentValue && !isUuid(parentValue)) {
    throw ApiErrors.taxonomyInvalid;
  }
  if ((type === "GAME" || type === "OTHER") && parentValue) {
    throw ApiErrors.taxonomyInvalid;
  }
  if (type === "EXPANSION" && !parentValue) {
    throw ApiErrors.taxonomyInvalid;
  }
  if (type === "EXPANSION" && !releaseDate) {
    throw ApiErrors.taxonomyInvalid;
  }
  if (type !== "EXPANSION" && releaseDate) {
    throw ApiErrors.taxonomyInvalid;
  }

  return {
    type: type as TaxonomyType,
    name,
    slug,
    description: description || null,
    parentId: parentValue,
    releaseDate: releaseDate ?? null,
    labels
  };
}

export function validateTaxonomyUpdate(payload: unknown) {
  const name = String((payload as { name?: string })?.name ?? "").trim();
  const slug = String((payload as { slug?: string })?.slug ?? "").trim();
  const description = String((payload as { description?: string })?.description ?? "").trim();
  const parentId = (payload as { parentId?: unknown })?.parentId;
  const releaseDate = parseReleaseDate((payload as { releaseDate?: unknown })?.releaseDate);
  const labels = parseLabels((payload as { labels?: unknown })?.labels);

  if (!name && !slug && !description && parentId === undefined && releaseDate === undefined && labels === null) {
    throw ApiErrors.taxonomyInvalid;
  }

  const parentValue = parentId === undefined
    ? undefined
    : parentId === null || parentId === ""
      ? null
      : String(parentId).trim();
  if (parentValue !== undefined && parentValue !== null && !isUuid(parentValue)) {
    throw ApiErrors.taxonomyInvalid;
  }

  return {
    name: name || undefined,
    slug: slug || undefined,
    description: description ? description : undefined,
    parentId: parentValue,
    releaseDate,
    labels
  };
}

export function validateProductCreate(payload: unknown) {
  const data = payload as Record<string, unknown>;
  const name = String(data.name ?? "").trim();
  const slug = String(data.slug ?? "").trim();
  const gameId = String(data.gameId ?? "").trim();
  const categoryId = String(data.categoryId ?? "").trim();
  const expansionId = String(data.expansionId ?? "").trim();
  const imageUrl = String(data.imageUrl ?? "").trim();
  const reason = String(data.reason ?? "").trim();
  const description = String(data.description ?? "").trim();
  const rarity = String(data.rarity ?? "").trim();
  const tagsRaw = data.tags;
  const availabilityStateRaw = String(data.availabilityState ?? "").trim().toUpperCase();
  const normalizedAvailability =
    availabilityStateRaw === "SOLD_OUT" ? "OUT_OF_STOCK" : availabilityStateRaw;
  const availabilityState: AvailabilityState = AVAILABILITY_STATES.includes(normalizedAvailability as AvailabilityState)
    ? (normalizedAvailability as AvailabilityState)
    : "OUT_OF_STOCK";

  const priceValue = data.price;
  const price = typeof priceValue === "number" ? priceValue : Number(priceValue);
  const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
  const isFeatured = typeof data.isFeatured === "boolean" ? data.isFeatured : false;
  const featuredOrderValue = data.featuredOrder;
  const featuredOrderNumber =
    typeof featuredOrderValue === "number"
      ? featuredOrderValue
      : featuredOrderValue
        ? Number(featuredOrderValue)
        : null;

  if (!name || !slug || !categoryId || !imageUrl || !reason) {
    throw ApiErrors.productInvalid;
  }
  if (!isUuid(categoryId)) {
    throw ApiErrors.productInvalid;
  }
  if (gameId && !isUuid(gameId)) {
    throw ApiErrors.productInvalid;
  }
  if (expansionId && !isUuid(expansionId)) {
    throw ApiErrors.productInvalid;
  }
  if (!gameId && expansionId) {
    throw ApiErrors.productInvalid;
  }

  if (!Number.isFinite(price)) {
    throw ApiErrors.productInvalid;
  }

  let tags: string[] | null = null;
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((value) => String(value).trim()).filter(Boolean);
  }

  return {
    name,
    slug,
    gameId: gameId || null,
    categoryId,
    expansionId: expansionId || null,
    price,
    imageUrl,
    reason,
    description: description || null,
    rarity: rarity || null,
    tags,
    availabilityState,
    isActive,
    isFeatured,
    featuredOrder: Number.isFinite(featuredOrderNumber ?? NaN) ? featuredOrderNumber : null
  };
}

export function validateProductUpdate(payload: unknown) {
  const data = payload as Record<string, unknown>;
  const result: {
    displayName?: string;
    slug?: string | null;
    category?: string | null;
    categoryId?: string | null;
    expansionId?: string | null;
    game?: string | null;
    gameId?: string | null;
    price?: number | null;
    imageUrl?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    rarity?: string | null;
    tags?: string[] | null;
    availabilityState?: string | null;
    isFeatured?: boolean;
    featuredOrder?: number | null;
    isActive?: boolean;
  } = {};

  const reason = String(data.reason ?? "").trim();
  if (!reason) {
    throw ApiErrors.productInvalid;
  }

  if (typeof data.displayName === "string") {
    result.displayName = data.displayName.trim() || undefined;
  }
  if (data.slug === null || typeof data.slug === "string") {
    result.slug = data.slug === null ? null : data.slug.trim() || null;
  }
  if (data.category === null || typeof data.category === "string") {
    result.category = data.category === null ? null : data.category.trim() || null;
  }
  if (data.categoryId === null || typeof data.categoryId === "string") {
    const value = data.categoryId === null ? null : data.categoryId.trim() || null;
    if (value && !isUuid(value)) {
      throw ApiErrors.productInvalid;
    }
    result.categoryId = value;
  }
  if (data.expansionId === null || typeof data.expansionId === "string") {
    const value = data.expansionId === null ? null : data.expansionId.trim() || null;
    if (value && !isUuid(value)) {
      throw ApiErrors.productInvalid;
    }
    result.expansionId = value;
  }
  if (data.game === null || typeof data.game === "string") {
    result.game = data.game === null ? null : data.game.trim() || null;
  }
  if (data.gameId === null || typeof data.gameId === "string") {
    const value = data.gameId === null ? null : data.gameId.trim() || null;
    if (value && !isUuid(value)) {
      throw ApiErrors.productInvalid;
    }
    result.gameId = value;
  }
  if (data.imageUrl === null || typeof data.imageUrl === "string") {
    result.imageUrl = data.imageUrl === null ? null : data.imageUrl.trim() || null;
  }
  if (data.shortDescription === null || typeof data.shortDescription === "string") {
    result.shortDescription =
      data.shortDescription === null ? null : data.shortDescription.trim() || null;
  }
  if (data.description === null || typeof data.description === "string") {
    result.description = data.description === null ? null : data.description.trim() || null;
  }
  if (data.rarity === null || typeof data.rarity === "string") {
    result.rarity = data.rarity === null ? null : data.rarity.trim() || null;
  }
  if (data.tags === null || Array.isArray(data.tags)) {
    result.tags = data.tags === null ? null : data.tags.map((value) => String(value).trim());
  }
  if (data.availabilityState === null || typeof data.availabilityState === "string") {
    const raw = data.availabilityState === null ? null : data.availabilityState.trim().toUpperCase();
    if (raw === null || raw === "") {
      result.availabilityState = null;
    } else if (raw === "SOLD_OUT") {
      result.availabilityState = "OUT_OF_STOCK";
    } else if (AVAILABILITY_STATES.includes(raw as AvailabilityState)) {
      result.availabilityState = raw;
    } else {
      throw ApiErrors.productInvalid;
    }
  }
  if (typeof data.isFeatured === "boolean") {
    result.isFeatured = data.isFeatured;
  }
  if (typeof data.isActive === "boolean") {
    result.isActive = data.isActive;
  }
  if (data.featuredOrder === null || typeof data.featuredOrder === "number") {
    result.featuredOrder = data.featuredOrder === null ? null : data.featuredOrder;
  }
  if (data.price === null || typeof data.price === "number") {
    result.price = data.price === null ? null : data.price;
  }

  if (Object.keys(result).length === 0) {
    throw ApiErrors.productInvalid;
  }

  return { data: result, reason };
}
