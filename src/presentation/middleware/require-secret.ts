import type { NextFunction, Request, Response } from "express";

import { env } from "../../config/env";

export function requireSecret(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-cloud-secret");
  if (!header || header !== env.sharedSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
