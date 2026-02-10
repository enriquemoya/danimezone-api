import { ApiErrors } from "../errors/api-error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9()\-\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type UserPayload = {
  email?: unknown;
  phone?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  birthDate?: unknown;
  role?: unknown;
  status?: unknown;
};

type UserRole = "CUSTOMER" | "ADMIN";
type UserStatus = "ACTIVE" | "DISABLED";

export type AddressPayload = {
  street?: unknown;
  externalNumber?: unknown;
  internalNumber?: unknown;
  postalCode?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
  country?: unknown;
  references?: unknown;
};

function toNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : null;
}

function parseBirthDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw ApiErrors.invalidRequest;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) {
    throw ApiErrors.invalidRequest;
  }
  return parsed;
}

export function validateUserCreate(payload: UserPayload) {
  const email = toNullableString(payload.email);
  const phone = toNullableString(payload.phone);

  if (!email && !phone) {
    throw ApiErrors.emailOrPhoneRequired;
  }

  if (email && !EMAIL_RE.test(email)) {
    throw ApiErrors.emailInvalid;
  }

  if (phone && !PHONE_RE.test(phone)) {
    throw ApiErrors.phoneInvalid;
  }

  const role = toNullableString(payload.role);
  if (role && role !== "CUSTOMER" && role !== "ADMIN") {
    throw ApiErrors.roleInvalid;
  }

  const status = toNullableString(payload.status);
  if (status && status !== "ACTIVE" && status !== "DISABLED") {
    throw ApiErrors.statusInvalid;
  }

  const birthDate = parseBirthDate(payload.birthDate);
  const parsedRole = role ? (role as UserRole) : null;
  const parsedStatus = status ? (status as UserStatus) : null;

  return {
    email,
    phone,
    firstName: toNullableString(payload.firstName),
    lastName: toNullableString(payload.lastName),
    birthDate,
    role: parsedRole ?? undefined,
    status: parsedStatus ?? undefined
  };
}

export function validateUserUpdate(payload: UserPayload) {
  const email = toNullableString(payload.email);
  const phone = toNullableString(payload.phone);

  if (email !== null && email !== undefined && !EMAIL_RE.test(email)) {
    throw ApiErrors.emailInvalid;
  }

  if (phone !== null && phone !== undefined && !PHONE_RE.test(phone)) {
    throw ApiErrors.phoneInvalid;
  }

  const role = toNullableString(payload.role);
  if (role && role !== "CUSTOMER" && role !== "ADMIN") {
    throw ApiErrors.roleInvalid;
  }

  const status = toNullableString(payload.status);
  if (status && status !== "ACTIVE" && status !== "DISABLED") {
    throw ApiErrors.statusInvalid;
  }

  const birthDate = payload.birthDate === undefined ? undefined : parseBirthDate(payload.birthDate);
  const parsedRole = role ? (role as UserRole) : null;
  const parsedStatus = status ? (status as UserStatus) : null;

  const data = {
    email: payload.email === undefined ? undefined : email,
    phone: payload.phone === undefined ? undefined : phone,
    firstName: payload.firstName === undefined ? undefined : toNullableString(payload.firstName),
    lastName: payload.lastName === undefined ? undefined : toNullableString(payload.lastName),
    birthDate,
    role: parsedRole ?? undefined,
    status: parsedStatus ?? undefined
  };

  const hasAny = Object.values(data).some((value) => value !== undefined);
  if (!hasAny) {
    throw ApiErrors.invalidRequest;
  }

  if (data.email === null && data.phone === null) {
    throw ApiErrors.emailOrPhoneRequired;
  }

  return data;
}

export function validateAddressCreate(payload: AddressPayload) {
  const street = toNullableString(payload.street);
  const externalNumber = toNullableString(payload.externalNumber);
  const postalCode = toNullableString(payload.postalCode);
  const neighborhood = toNullableString(payload.neighborhood);
  const city = toNullableString(payload.city);
  const state = toNullableString(payload.state);
  const country = toNullableString(payload.country);

  if (!street || !externalNumber || !postalCode || !neighborhood || !city || !state || !country) {
    throw ApiErrors.addressInvalid;
  }

  return {
    street,
    externalNumber,
    internalNumber: toNullableString(payload.internalNumber),
    postalCode,
    neighborhood,
    city,
    state,
    country,
    references: toNullableString(payload.references)
  };
}

export function validateAddressUpdate(payload: AddressPayload) {
  const data = {
    street: payload.street === undefined ? undefined : toNullableString(payload.street),
    externalNumber: payload.externalNumber === undefined ? undefined : toNullableString(payload.externalNumber),
    internalNumber: payload.internalNumber === undefined ? undefined : toNullableString(payload.internalNumber),
    postalCode: payload.postalCode === undefined ? undefined : toNullableString(payload.postalCode),
    neighborhood: payload.neighborhood === undefined ? undefined : toNullableString(payload.neighborhood),
    city: payload.city === undefined ? undefined : toNullableString(payload.city),
    state: payload.state === undefined ? undefined : toNullableString(payload.state),
    country: payload.country === undefined ? undefined : toNullableString(payload.country),
    references: payload.references === undefined ? undefined : toNullableString(payload.references)
  };

  const hasAny = Object.values(data).some((value) => value !== undefined);
  if (!hasAny) {
    throw ApiErrors.addressInvalid;
  }

  return data;
}
