/**
 * Clear identity-adjacent and customer PII browser persistence on logout.
 * Does not clear cart (in-memory) or safe UI preference allowlist keys.
 */
import {
  BROWSER_STORAGE_CLEAR_ON_LOGOUT_PREFIXES,
} from "@/lib/admin-performance-contract";
import { clearInflightReads } from "@/lib/request-share";

export function clearPrivateBrowserPersistence(): void {
  clearInflightReads();

  try {
    sessionStorage.removeItem("telepizza.auth.next");
    sessionStorage.removeItem("telepizza.auth.flow");
  } catch {
    /* private mode */
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      const shouldClear = BROWSER_STORAGE_CLEAR_ON_LOGOUT_PREFIXES.some(
        (prefix) => key === prefix || key.startsWith(prefix),
      );
      if (shouldClear) localStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }
}
