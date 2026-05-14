const crypto = require("crypto");
const { decodeFrame, send, sendError } = require("./utils/ws");
const { PUBLIC, AUTHED } = require("./handlers");
const { clearUserSocket } = require("./handlers/state");

const clients = new Set();

const handleMessage = async (socket, rawMessage) => {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    return sendError(socket, null, "Invalid JSON message");
  }

  const { type, payload } = message || {};
  if (!type || typeof type !== "string") {
    return sendError(socket, null, "Message 'type' is required");
  }

  try {
    if (PUBLIC[type]) {
      await PUBLIC[type](socket, payload || {});
      return;
    }
    if (AUTHED[type]) {
      if (!socket.userId) {
        return sendError(socket, type, "Authentication required");
      }
      await AUTHED[type](socket, payload || {});
      return;
    }
    sendError(socket, type, "Unknown message type");
  } catch (error) {
    console.error(`[ws] handler error (${type}):`, error);
    sendError(socket, type, error.message || "Internal error");
  }
};

const acceptConnection = (socket, key) => {
  const acceptKey = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "",
      "",
    ].join("\r\n")
  );
};

const cleanup = (socket) => {
  clients.delete(socket);
  if (socket.userId) clearUserSocket(socket.userId, socket);
};

const setupWebSocketServer = (server) => {
  server.on("upgrade", (req, socket) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.destroy();
      return;
    }

    acceptConnection(socket, key);
    clients.add(socket);
    send(socket, {
      type: "hello",
      message:
        "Authenticate with {type:'auth', payload:{token}} or {type:'register', ...}",
    });

    socket.on("data", (buffer) => {
      const frame = decodeFrame(buffer);
      if (frame.opcode === 0x8) {
        cleanup(socket);
        socket.end();
        return;
      }
      if (frame.opcode === 0x1) {
        handleMessage(socket, frame.payload);
      }
    });

    socket.on("close", () => cleanup(socket));
    socket.on("error", () => cleanup(socket));
  });
};

module.exports = setupWebSocketServer;
