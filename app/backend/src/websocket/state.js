const socketsByConnection = new Map();

export function registerSocket(connectionId, ws) {
  socketsByConnection.set(connectionId, ws);
}

export function unregisterSocket(connectionId) {
  socketsByConnection.delete(connectionId);
}

export function getSocket(connectionId) {
  return socketsByConnection.get(connectionId);
}

export function sendToConnection(connectionId, payload) {
  const ws = getSocket(connectionId);
  if (!ws || ws.readyState !== 1) {
    return;
  }
  ws.send(JSON.stringify(payload));
}
