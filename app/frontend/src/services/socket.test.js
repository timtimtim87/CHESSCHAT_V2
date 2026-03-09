import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChessChatSocket } from "./socket";

let originalWebSocket;

class MockWebSocket {
  static instances = [];
  static OPEN = 1;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.send = vi.fn();
    MockWebSocket.instances.push(this);
  }

  close(code = 1000) {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose({ code });
    }
  }
}

function flushPromises() {
  return Promise.resolve();
}

describe("ChessChatSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
  });

  it("fetches a fresh token for reconnect attempts", async () => {
    const getToken = vi.fn()
      .mockResolvedValueOnce("token-1")
      .mockResolvedValueOnce("token-2");

    const socket = new ChessChatSocket({
      getToken,
      onMessage: () => {},
      onOpen: () => {},
      onClose: () => {},
      onStateChange: () => {}
    });

    await socket.connect();
    expect(MockWebSocket.instances[0].url).toContain("token-1");

    MockWebSocket.instances[0].close(1006);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();

    expect(MockWebSocket.instances[1].url).toContain("token-2");
    expect(getToken).toHaveBeenCalledTimes(2);
    socket.disconnect();
  });

  it("stops reconnecting after unauthorized close", async () => {
    const getToken = vi.fn().mockResolvedValue("token-1");
    const onClose = vi.fn();

    const socket = new ChessChatSocket({
      getToken,
      onMessage: () => {},
      onOpen: () => {},
      onClose,
      onStateChange: () => {}
    });

    await socket.connect();
    MockWebSocket.instances[0].close(4001);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(onClose).toHaveBeenCalledWith({ willReconnect: false });
    socket.disconnect();
  });
});
