"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyLiveInboxChange,
  parseInboxRows,
  reconcileInboxRows,
  type InboxRow
} from "@/features/booking/booking-inbox-live";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const CATCH_UP_INTERVAL_MS = 30_000;
const BOOKING_COLUMNS = "id, name, mobile, service_name, note, starts_at";
const CHIME_HISTORY_LIMIT = 256;

type SoundState = "on" | "muted" | "blocked";

const muteStorageKey = (tenantId: string) => `karon-booking-sound-muted:${tenantId}`;
const chimeStorageKey = (tenantId: string) => `karon-booking-chimed:${tenantId}`;

const readMuted = (tenantId: string) => {
  try {
    return localStorage.getItem(muteStorageKey(tenantId)) === "1";
  } catch {
    return false;
  }
};

const writeMuted = (tenantId: string, muted: boolean) => {
  try {
    localStorage.setItem(muteStorageKey(tenantId), muted ? "1" : "0");
  } catch {
    // Sound still toggles for this session when browser storage is unavailable.
  }
};

const readChimedIds = (tenantId: string) => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(chimeStorageKey(tenantId)) ?? "[]");

    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const claimChime = async (tenantId: string, requestId: string, play: () => Promise<void>) => {
  const claimAndPlay = async () => {
    const chimedIds = readChimedIds(tenantId);

    if (chimedIds.includes(requestId)) {
      return;
    }

    try {
      localStorage.setItem(
        chimeStorageKey(tenantId),
        JSON.stringify([...chimedIds, requestId].slice(-CHIME_HISTORY_LIMIT))
      );
    } catch {
      // Cross-tab deduplication remains best effort when browser storage is unavailable.
    }

    await play();
  };

  if (!navigator.locks) {
    await claimAndPlay();
    return;
  }

  try {
    await navigator.locks.request(
      `karon-booking-chime:${tenantId}`,
      { ifAvailable: true },
      async (lock) => {
        if (lock) {
          await claimAndPlay();
        }
      }
    );
  } catch {
    await claimAndPlay();
  }
};

const newAudioContext = () => {
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  return AudioContextConstructor ? new AudioContextConstructor() : null;
};

const playSoftChime = async (existing: AudioContext | null) => {
  const context = existing?.state === "closed" ? newAudioContext() : existing ?? newAudioContext();

  if (!context) {
    throw new Error("Audio is unavailable.");
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  if (context.state !== "running") {
    throw new Error("Audio is blocked.");
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startsAt = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, startsAt);
  oscillator.frequency.exponentialRampToValueAtTime(880, startsAt + 0.14);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.035, startsAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + 0.23);

  return context;
};

const useLiveBookingRequests = (tenantId: string) => {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => readMuted(tenantId));
  const [audioBlocked, setAudioBlocked] = useState(false);
  const rowsRef = useRef<InboxRow[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  const initializedRef = useRef(false);
  const mutedRef = useRef(muted);
  const audioContextRef = useRef<AudioContext | null>(null);

  const commitRows = useCallback((next: InboxRow[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const chimeFor = useCallback(async (row: InboxRow) => {
    if (seenIdsRef.current.has(row.id)) {
      return;
    }

    seenIdsRef.current.add(row.id);

    if (mutedRef.current) {
      return;
    }

    await claimChime(tenantId, row.id, async () => {
      try {
        audioContextRef.current = await playSoftChime(audioContextRef.current);
        setAudioBlocked(false);
      } catch {
        setAudioBlocked(true);
      }
    });
  }, [tenantId]);

  const setSoundMuted = useCallback(
    (next: boolean) => {
      mutedRef.current = next;
      setMuted(next);
      setAudioBlocked(false);
      writeMuted(tenantId, next);
    },
    [tenantId]
  );

  const enableSound = useCallback(async () => {
    setSoundMuted(false);

    try {
      audioContextRef.current = await playSoftChime(audioContextRef.current);
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
  }, [setSoundMuted]);

  const removeRow = useCallback(
    (id: string) => commitRows(rowsRef.current.filter((row) => row.id !== id)),
    [commitRows]
  );

  const restoreRow = useCallback(
    (row: InboxRow) => {
      if (rowsRef.current.some((item) => item.id === row.id)) {
        return;
      }

      commitRows(
        [...rowsRef.current, row].sort((left, right) =>
          left.startsAt.localeCompare(right.startsAt)
        )
      );
    },
    [commitRows]
  );

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    []
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== muteStorageKey(tenantId)) {
        return;
      }

      const next = event.newValue === "1";
      mutedRef.current = next;
      setMuted(next);
      setAudioBlocked(false);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [tenantId]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let revision = 0;

    const catchUp = async () => {
      const requestRevision = ++revision;
      const { data, error } = await supabase
        .from("booking_requests")
        .select(BOOKING_COLUMNS)
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("starts_at", { ascending: true });

      if (!active || requestRevision !== revision) {
        return;
      }

      if (error) {
        setLoadError("Could not refresh new bookings. We will keep trying.");
        return;
      }

      setLoadError(null);
      setReady(true);
      const next = parseInboxRows(data);

      if (!initializedRef.current) {
        next.forEach((row) => seenIdsRef.current.add(row.id));
        initializedRef.current = true;
        commitRows(next);
        return;
      }

      const reconciled = reconcileInboxRows(rowsRef.current, next, seenIdsRef.current);
      commitRows(reconciled.rows);
      reconciled.added.forEach((row) => void chimeFor(row));
    };

    const applyChange = (value: unknown) => {
      revision += 1;
      const changed = applyLiveInboxChange(rowsRef.current, value, tenantId);
      commitRows(changed.rows);

      if (changed.added) {
        void chimeFor(changed.added);
      }
    };

    void (async () => {
      await catchUp();

      if (!active) {
        return;
      }

      channel = supabase
        .channel(`booking-inbox:${tenantId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "booking_requests",
            filter: `tenant_id=eq.${tenantId}`
          },
          (payload) => applyChange(payload.new)
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "booking_requests",
            filter: `tenant_id=eq.${tenantId}`
          },
          (payload) => applyChange(payload.new)
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void catchUp();
          }
        });
    })();

    const onCatchUp = () => void catchUp();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onCatchUp();
      }
    };
    const timer = window.setInterval(onCatchUp, CATCH_UP_INTERVAL_MS);

    window.addEventListener("online", onCatchUp);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", onCatchUp);
      document.removeEventListener("visibilitychange", onVisibility);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [chimeFor, commitRows, tenantId]);

  return {
    rows,
    ready,
    loadError,
    soundState: (muted ? "muted" : audioBlocked ? "blocked" : "on") as SoundState,
    setSoundMuted,
    enableSound,
    removeRow,
    restoreRow
  };
};

export { useLiveBookingRequests };
export type { SoundState };
