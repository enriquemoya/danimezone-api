import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";

type JwtPayload = {
  sub: string;
  role: string;
};

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (!env.jwtSecret) {
    res.status(500).json({ error: "server" });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string" || !decoded) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const payload = decoded as JwtPayload;
    if (payload.role !== "ADMIN") {
      res.status(403).json({ error: "unauthorized" });
      return;
    }
    (req as Request & { auth?: { userId: string; role: string } }).auth = {
      userId: payload.sub,
      role: payload.role
    };
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
}
