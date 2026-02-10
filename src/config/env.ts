import dotenv from "dotenv";

dotenv.config();

const portRaw = process.env.PORT;
const port = Number(portRaw || 4000);
const databaseUrl = process.env.DATABASE_URL;
const sharedSecret = process.env.CLOUD_SHARED_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const onlineStoreBaseUrl = process.env.ONLINE_STORE_BASE_URL;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const orderExpirationIntervalMs = process.env.ORDER_EXPIRATION_INTERVAL_MS
  ? Number(process.env.ORDER_EXPIRATION_INTERVAL_MS)
  : undefined;

const envStatus = {
  port: Boolean(portRaw),
  databaseUrl: Boolean(databaseUrl),
  sharedSecret: Boolean(sharedSecret),
  jwtSecret: Boolean(jwtSecret),
  onlineStoreBaseUrl: Boolean(onlineStoreBaseUrl),
  smtpHost: Boolean(smtpHost),
  smtpPort: Boolean(smtpPort && !Number.isNaN(smtpPort)),
  smtpUser: Boolean(smtpUser),
  smtpPass: Boolean(smtpPass),
  smtpFrom: Boolean(smtpFrom)
};

export const env = {
  port,
  databaseUrl,
  sharedSecret,
  jwtSecret,
  onlineStoreBaseUrl,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpFrom,
  orderExpirationIntervalMs
};

export const envChecks = envStatus;
