import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyChallenge } from "../utils/captcha";

/**
 * CAPTCHA verification for /auth/register and /auth/login.
 *
 * Expects `captchaId` and `captchaAnswer` in the request body; the challenge
 * store validates and consumes the record (single-use), so credential stuffing
 * and automated account creation are stopped before the DB is hit.
 *
 * In NODE_ENV=test the middleware short-circuits so integration tests do not
 * have to solve challenges.
 */
export function verifyCaptcha(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const id = body.captchaId as string | undefined;
  const answer = body.captchaAnswer as string | undefined;

  if (process.env.NODE_ENV === "test") {
    if (!answer) return next(AppError.badRequest("CAPTCHA answer required"));
    delete body.captchaId;
    delete body.captchaAnswer;
    return next();
  }

  if (!id || !answer) {
    return next(AppError.badRequest("CAPTCHA required — please solve the challenge"));
  }

  if (!verifyChallenge(id, answer)) {
    return next(AppError.badRequest("CAPTCHA incorrect or expired — please try again"));
  }

  // Strip so downstream Zod schemas do not see unknown fields.
  delete body.captchaId;
  delete body.captchaAnswer;
  next();
}
