export const SESSION_COOKIE_NAME = "angle_session";
export const BROWSER_COOKIE_NAME = "angle_browser_id";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function shouldUseSecureCookies() {
  return process.env.COOKIE_SECURE === "true";
}
