// Authentication middleware (consolidated). The single source of truth lives in
// modules/auth/auth.middleware; this re-export makes every existing import
// resolve to the same cookie-aware implementation.
export { authenticate, authorize, optionalAuthenticate, requireMfaForAdmin } from "../modules/auth/auth.middleware";
