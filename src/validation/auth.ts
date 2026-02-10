import { ApiErrors } from "../errors/api-error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailPayload(payload: unknown) {
  const email = String((payload as { email?: string })?.email ?? "").trim();
  if (!email) {
    throw ApiErrors.emailRequired;
  }
  if (!EMAIL_RE.test(email)) {
    throw ApiErrors.emailInvalid;
  }
  return email;
}

export function validateTokenPayload(payload: unknown) {
  const token = String((payload as { token?: string })?.token ?? "").trim();
  if (!token) {
    throw ApiErrors.invalidRequest;
  }
  return token;
}

export function validateRefreshPayload(payload: unknown) {
  const refreshToken = String((payload as { refreshToken?: string })?.refreshToken ?? "").trim();
  if (!refreshToken) {
    throw ApiErrors.invalidRequest;
  }
  return refreshToken;
}

export function validatePasswordLoginPayload(payload: unknown) {
  const email = validateEmailPayload(payload);
  const password = String((payload as { password?: string })?.password ?? "").trim();
  if (!password) {
    throw ApiErrors.invalidRequest;
  }
  return { email, password };
}
