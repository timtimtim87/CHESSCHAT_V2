export class ChessChatSocket {
  constructor({ token, onMessage, onOpen, onClose, onStateChange }) {
    this.token = token;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onStateChange = onStateChange;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectDelayMs = 10000;
  }

  connect() {
    this.notifyState({ status: this.reconnectAttempts > 0 ? "reconnecting" : "connecting" });

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyState({ status: "connected" });
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (this.onMessage) this.onMessage(payload);
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (event.code === 4001) {
        this.shouldReconnect = false;
      }

      const willReconnect = this.shouldReconnect;
      if (this.onClose) this.onClose({ willReconnect });

      if (this.shouldReconnect) {
        this.reconnectAttempts += 1;
        const delayMs = Math.min(2000 * this.reconnectAttempts, this.maxReconnectDelayMs);
        this.notifyState({
          status: "reconnecting",
          reconnectAttempt: this.reconnectAttempts,
          retryInMs: delayMs
        });
        this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
      } else {
        this.notifyState({ status: "closed" });
      }
    };
  }

  send(type, payload = {}) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send("heartbeat", {});
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.ws?.close();
  }

  notifyState(payload) {
    if (this.onStateChange) {
      this.onStateChange(payload);
    }
  }
}
