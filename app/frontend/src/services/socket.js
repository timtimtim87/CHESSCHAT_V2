export class ChessChatSocket {
  constructor({ token, onMessage, onOpen, onClose }) {
    this.token = token;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.shouldReconnect = true;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.startHeartbeat();
      if (this.onOpen) this.onOpen();
    };

    this.ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (this.onMessage) this.onMessage(payload);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.onClose) this.onClose();
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2000);
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
}
