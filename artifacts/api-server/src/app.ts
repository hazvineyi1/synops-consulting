import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind the Replit reverse proxy, required for secure cookies and rate limiting.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for session management.");
}

const PgSession = connectPgSimple(session);

app.use(
  session({
    name: "sid",
    store: new PgSession({
      pool,
      tableName: "user_sessions",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }),
);

// CSRF defense-in-depth: reject cross-origin state-changing requests.
// SameSite=lax cookies already block cross-site cookie sending; this adds an
// explicit Origin check. Non-browser clients (no Origin header) are allowed.
const sameOriginGuard: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }
  try {
    const originHost = new URL(origin).host;
    const host = req.get("host");
    const allowed = (process.env.REPLIT_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (originHost === host || allowed.includes(originHost)) {
      next();
      return;
    }
    req.log.warn({ origin, host }, "Blocked cross-origin mutating request");
    res.status(403).json({ error: "Cross-origin request blocked" });
  } catch {
    res.status(403).json({ error: "Invalid origin" });
  }
};
app.use(sameOriginGuard);

app.use("/api", router);

export default app;
