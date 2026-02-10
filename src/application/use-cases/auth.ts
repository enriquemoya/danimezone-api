import type { AuthRepository, AuthTokens, EmailService } from "../ports";

export type AuthUseCases = {
  requestMagicLink: (email: string, locale: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<AuthTokens | null>;
  refreshTokens: (refreshToken: string) => Promise<AuthTokens | null>;
  revokeRefreshToken: (refreshToken: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<AuthTokens | null>;
};

export function createAuthUseCases(deps: {
  authRepository: AuthRepository;
  emailService: EmailService;
}): AuthUseCases {
  return {
    async requestMagicLink(email: string, locale: string) {
      const result = await deps.authRepository.requestMagicLink(email);
      const link = deps.authRepository.buildMagicLink(locale, result.token);

      await deps.emailService.sendMagicLinkEmail({
        to: email,
        subject: "Verify your email",
        html: `<p>Use this link to sign in:</p><p><a href="${link}">${link}</a></p>`,
        text: `Use this link to sign in: ${link}`
      });
    },
    verifyMagicLink(token: string) {
      return deps.authRepository.verifyMagicLink(token);
    },
    refreshTokens(refreshToken: string) {
      return deps.authRepository.refreshTokens(refreshToken);
    },
    revokeRefreshToken(refreshToken: string) {
      return deps.authRepository.revokeRefreshToken(refreshToken);
    },
    loginWithPassword(email: string, password: string) {
      return deps.authRepository.loginWithPassword(email, password);
    }
  };
}
