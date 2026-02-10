import type { NextFunction, Request, Response } from "express";

const allowedOrigins = [
  "https://danimezone.com",
  "https://www.danimezone.com",
  "https://api.danimezone.com",
  "http://localhost:3000"
];

const allowedMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const allowedHeaders = "Content-Type, Authorization, X-Cloud-Secret, X-Requested-With";
const maxAgeSeconds = 86400;

export function logCorsConfig() {
  const env = process.env.ENVIROMENT || process.env.NODE_ENV || "undefined";
  const originList = allowedOrigins.join(", ");
  console.log(`[cors] ENVIROMENT=${env} allowedOrigins=${originList}`);
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).send("CORS origin not allowed");
    return;
  }

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", allowedMethods);
    res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
    res.setHeader("Access-Control-Max-Age", String(maxAgeSeconds));
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
