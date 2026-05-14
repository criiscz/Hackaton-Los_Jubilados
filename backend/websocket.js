const crypto = require("crypto");
const { decodeFrame, send, sendError } = require("./utils/ws");
const { PUBLIC, AUTHED } = require("./handlers");
const { clearUserSocket } = require("./handlers/state");
const { log, previewPayload } = require("./utils/logger");

const clients = new Set();

const handleMessage = async (socket, rawMessage) => {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    log("WS<-", "invalid-json", {
      remote: socket.remoteAddr,
      userId: socket.userId || null,
      raw: previewPayload(rawMessage),
    });
    return sendError(socket, null, "Invalid JSON message");
  }

  const { type, payload } = message || {};
  if (!type || typeof type !== "string") {
    log("WS<-", "missing-type", {
      remote: socket.remoteAddr,
      userId: socket.userId || null,
      message: previewPayload(message),
    });
    return sendError(socket, null, "Message 'type' is required");
  }

  log("WS<-", {
    remote: socket.remoteAddr,
    userId: socket.userId || null,
    type,
    payload: previewPayload(payload),
  });

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
    log("WS", "handler-error", {
      remote: socket.remoteAddr,
      userId: socket.userId || null,
      type,
      msg: error.message,
      stack: error.stack,
    });
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
    const remoteAddr = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

    if (req.url !== "/ws") {
      log("WS", "reject-url", { remote: remoteAddr, url: req.url });
      socket.destroy();
      return;
    }
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      log("WS", "reject-no-key", { remote: remoteAddr, url: req.url });
      socket.destroy();
      return;
    }

    socket.remoteAddr = remoteAddr;
    log("WS", "upgrade", {
      remote: remoteAddr,
      url: req.url,
      origin: req.headers["origin"],
      ua: req.headers["user-agent"],
      xff: req.headers["x-forwarded-for"],
    });

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
        log("WS", "close-frame", {
          remote: socket.remoteAddr,
          userId: socket.userId || null,
        });
        cleanup(socket);
        socket.end();
        return;
      }
      if (frame.opcode === 0x1) {
        handleMessage(socket, frame.payload);
      }
    });

    socket.on("close", () => {
      log("WS", "close", {
        remote: socket.remoteAddr,
        userId: socket.userId || null,
      });
      cleanup(socket);
    });
    socket.on("error", (err) => {
      log("WS", "error", {
        remote: socket.remoteAddr,
        userId: socket.userId || null,
        msg: err && err.message,
      });
      cleanup(socket);
    });
  });
};

module.exports = setupWebSocketServer;
