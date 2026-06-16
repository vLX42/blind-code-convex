import { useEffect, useRef, useState } from "react";

// Returns whether this browser tab is the "active" one for a given key.
//
// Players sometimes end up with the same game open in two tabs/windows. Both
// would run the autosave + submit logic against the same entry, and an empty
// duplicate tab could overwrite the real code. We elect a single leader (the
// most recently focused tab) via localStorage so only that tab persists.
const HEARTBEAT_MS = 5000;
const STALE_MS = 15000;

type Claim = { id: string; ts: number };

export function useActiveTab(key: string | null): boolean {
  const tabIdRef = useRef<string>("");
  if (!tabIdRef.current) {
    tabIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
  }

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!key) return;
    const storageKey = `blindcode_active_tab_${key}`;
    const tabId = tabIdRef.current;

    const readOwner = (): Claim | null => {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as Claim) : null;
      } catch {
        return null;
      }
    };

    const claim = () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ id: tabId, ts: Date.now() })
      );
      setIsActive(true);
    };

    // On mount: take leadership if we're focused or nobody owns it yet,
    // otherwise reflect the current owner.
    const owner = readOwner();
    if (document.hasFocus() || !owner) {
      claim();
    } else {
      setIsActive(owner.id === tabId);
    }

    // Another tab wrote to the key — re-check who the leader is.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return;
      setIsActive(readOwner()?.id === tabId);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", claim);

    // Keep our claim fresh while we're the leader; take over if the current
    // leader went stale (closed/crashed) and we're the focused tab.
    const heartbeat = setInterval(() => {
      const current = readOwner();
      if (current?.id === tabId) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ id: tabId, ts: Date.now() })
        );
      } else if (
        document.hasFocus() &&
        (!current || Date.now() - current.ts > STALE_MS)
      ) {
        claim();
      }
    }, HEARTBEAT_MS);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", claim);
      clearInterval(heartbeat);
    };
  }, [key]);

  return isActive;
}

export default useActiveTab;
