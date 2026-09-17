import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLiveBookingRequests } from "./use-live-booking-requests";

const tenantId = "11111111-1111-4111-8111-111111111111";

const realtime = vi.hoisted(() => {
  const callbacks: Array<(payload: { new: unknown }) => void> = [];
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn()
  };
  const channel = {
    on: vi.fn(
      (
        _type: string,
        _filter: unknown,
        callback: (payload: { new: unknown }) => void
      ) => {
        callbacks.push(callback);
        return channel;
      }
    ),
    subscribe: vi.fn((callback: (status: string) => void) => {
      callback("SUBSCRIBED");
      return channel;
    })
  };
  const client = {
    from: vi.fn(() => query),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn()
  };

  return { callbacks, channel, client, query };
});

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabase: () => realtime.client
}));

let audioBlocked = false;
let chimeCount = 0;
let lockHeld = false;

const locks = {
  request: vi.fn(
    async (
      _name: string,
      _options: LockOptions,
      callback: (lock: Lock | null) => Promise<void>
    ) => {
      if (lockHeld) {
        return callback(null);
      }

      lockHeld = true;

      try {
        return await callback({ name: "booking-chime", mode: "exclusive" });
      } finally {
        lockHeld = false;
      }
    }
  )
};

class FakeAudioContext {
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  state: AudioContextState = audioBlocked ? "suspended" : "running";

  constructor() {
    chimeCount += 1;
  }

  async close() {
    this.state = "closed";
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    } as unknown as GainNode;
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      start: vi.fn(),
      stop: vi.fn(),
      type: "sine"
    } as unknown as OscillatorNode;
  }

  async resume() {
    if (audioBlocked) {
      throw new Error("Autoplay blocked");
    }

    this.state = "running";
  }
}

const request = {
  id: "22222222-2222-4222-8222-222222222222",
  tenant_id: tenantId,
  name: "Fake Booking",
  mobile: "09170000000",
  service_name: "Checkup",
  note: null,
  starts_at: "2026-09-18T02:00:00.000Z",
  status: "pending"
};

describe("useLiveBookingRequests", () => {
  beforeEach(() => {
    audioBlocked = false;
    chimeCount = 0;
    lockHeld = false;
    localStorage.clear();
    realtime.callbacks.length = 0;
    realtime.channel.on.mockClear();
    realtime.channel.subscribe.mockClear();
    realtime.client.from.mockClear();
    realtime.client.channel.mockClear();
    realtime.client.removeChannel.mockClear();
    realtime.query.order.mockReset().mockResolvedValue({ data: [], error: null });
    vi.stubGlobal("AudioContext", FakeAudioContext);
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: locks
    });
  });

  it("plays at most one chime when Realtime delivers a new request", async () => {
    const { result } = renderHook(() => useLiveBookingRequests(tenantId));

    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      realtime.callbacks[0]?.({ new: request });
    });

    expect(result.current.rows).toHaveLength(1);
    expect(chimeCount).toBe(1);

    await act(async () => {
      realtime.callbacks[0]?.({ new: request });
    });

    expect(chimeCount).toBe(1);
  });

  it("plays one chime when two tabs receive the same request", async () => {
    const first = renderHook(() => useLiveBookingRequests(tenantId));
    const second = renderHook(() => useLiveBookingRequests(tenantId));

    await waitFor(() => {
      expect(first.result.current.ready).toBe(true);
      expect(second.result.current.ready).toBe(true);
    });

    await act(async () => {
      await Promise.all([
        realtime.callbacks[0]?.({ new: request }),
        realtime.callbacks[2]?.({ new: request })
      ]);
    });

    expect(first.result.current.rows).toHaveLength(1);
    expect(second.result.current.rows).toHaveLength(1);
    expect(chimeCount).toBe(1);
  });

  it("keeps the visual row and exposes the fallback when autoplay is blocked", async () => {
    audioBlocked = true;
    const { result } = renderHook(() => useLiveBookingRequests(tenantId));

    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      realtime.callbacks[0]?.({ new: request });
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.soundState).toBe("blocked");
    expect(chimeCount).toBe(1);
  });
});
