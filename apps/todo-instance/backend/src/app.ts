import cookieParser from "cookie-parser";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import { randomUUID } from "node:crypto";

type Session = {
  userId: string;
  createdAt: number;
};

const COOKIE_NAME = "sf_sid";

function getSid(req: Request): string | null {
  const v = req.cookies?.[COOKIE_NAME];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function createBackendApp(): {
  app: express.Express;
  sessions: Map<string, Session>;
} {
  const app = express();
  const sessions = new Map<string, Session>();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  // Two-port dev topology: allow frontend dev server to call the API with cookies.
  app.use(
    cors({
      origin: "http://localhost:5174",
      credentials: true,
    }),
  );

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/api/session/login", (req: Request, res: Response) => {
    const userId =
      typeof req.body?.userId === "string" && req.body.userId.trim().length > 0
        ? req.body.userId.trim()
        : "user_demo";

    const sid = randomUUID();
    sessions.set(sid, { userId, createdAt: Date.now() });

    res.cookie(COOKIE_NAME, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({ ok: true, userId });
  });

  app.get("/api/session/me", (req: Request, res: Response) => {
    const sid = getSid(req);
    if (!sid) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

    const s = sessions.get(sid);
    if (!s) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

    res.status(200).json({ ok: true, userId: s.userId });
  });

  app.post("/api/session/logout", (req: Request, res: Response) => {
    const sid = getSid(req);
    if (sid) sessions.delete(sid);

    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(200).json({ ok: true });
  });

  return { app, sessions };
}

