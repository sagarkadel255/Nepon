import { Router, Request, Response } from "express";
import { logger } from "../../utils/logger";
import { SecurityEvent } from "../../models/SecurityEvent";

const router = Router();

/**
 * CSP violation reporting endpoint. Browsers POST here when a Content Security
 * Policy violation occurs; the payload is logged and stored as a SecurityEvent
 * so admins can detect attempted XSS or misconfigurations. Intentionally
 * unauthenticated (browsers send these without credentials) and tolerant of
 * payload variations across browsers.
 */
router.post("/csp-report", (req: Request, res: Response) => {
  const cspReport = req.body?.["csp-report"] || req.body;

  const directive = cspReport?.["violated-directive"] || "unknown";
  const blockedUri = cspReport?.["blocked-uri"] || "unknown";
  const documentUri = cspReport?.["document-uri"] || "unknown";
  const sourceFile = cspReport?.["source-file"] || "unknown";
  const lineNumber = cspReport?.["line-number"] || 0;

  logger.warn("CSP violation report received", {
    directive,
    blockedUri,
    documentUri,
    sourceFile,
    lineNumber,
  });

  SecurityEvent.create({
    userId: null,
    type: "suspicious_activity",
    ip: req.ip || req.socket.remoteAddress || "unknown",
    userAgent: req.headers["user-agent"] || "",
    metadata: {
      type: "csp_violation",
      directive,
      blockedUri,
      documentUri,
      sourceFile,
      lineNumber,
    },
  }).catch((err) => {
    logger.error("Failed to persist CSP violation event", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  res.status(204).send();
});

export default router;