import { ApiErrors } from "../errors/api-error";
import { validateAddressCreate } from "./users";

const PHONE_RE = /^[+0-9()\-\s]+$/;

type AddressInput = {
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

type ProfilePayload = {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  address?: AddressInput;
};

function toNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : null;
}

function hasAddressData(address?: AddressInput) {
  if (!address || typeof address !== "object") {
    return false;
  }
  return Object.values(address).some((value) => {
    if (value === null || value === undefined) {
      return false;
    }
    return String(value).trim().length > 0;
  });
}

export function validateProfileUpdate(payload: ProfilePayload) {
  const phone = payload.phone === undefined ? undefined : toNullableString(payload.phone);
  if (phone !== undefined && phone !== null && !PHONE_RE.test(phone)) {
    throw ApiErrors.phoneInvalid;
  }

  const firstName = payload.firstName === undefined ? undefined : toNullableString(payload.firstName);
  const lastName = payload.lastName === undefined ? undefined : toNullableString(payload.lastName);

  const addressInput = payload.address;
  const address = hasAddressData(addressInput)
    ? validateAddressCreate({
        street: addressInput?.street,
        externalNumber: addressInput?.externalNumber,
        internalNumber: addressInput?.internalNumber,
        postalCode: addressInput?.postalCode,
        neighborhood: addressInput?.neighborhood,
        city: addressInput?.city,
        state: addressInput?.state,
        country: addressInput?.country,
        references: addressInput?.references
      })
    : undefined;

  const hasAny =
    firstName !== undefined || lastName !== undefined || phone !== undefined || address !== undefined;

  if (!hasAny) {
    throw ApiErrors.invalidRequest;
  }

  return {
    user: {
      firstName,
      lastName,
      phone
    },
    address
  };
}

export function validatePasswordUpdate(payload: unknown) {
  const password = String((payload as { password?: unknown })?.password ?? "").trim();
  const confirm = String((payload as { confirmPassword?: unknown })?.confirmPassword ?? "").trim();

  if (!password || !confirm) {
    throw ApiErrors.invalidRequest;
  }

  if (password !== confirm) {
    throw ApiErrors.invalidRequest;
  }

  return { password };
}
