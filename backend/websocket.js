const crypto = require("crypto");
const { Todo } = require("./models/todos/todo");

const clients = new Set();

const encodeFrame = (data) => {
  const payload = Buffer.from(data);
  const payloadLength = payload.length;

  if (payloadLength < 126) {
    return Buffer.concat([Buffer.from([0x81, payloadLength]), payload]);
  }

  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payload]);
};

const send = (socket, message) => {
  if (!socket.destroyed) {
    socket.write(encodeFrame(JSON.stringify(message)));
  }
};

const broadcast = (message) => {
  clients.forEach((client) => send(client, message));
};

const decodeFrame = (buffer) => {
  const opcode = buffer[0] & 0x0f;
  let offset = 2;
  let payloadLength = buffer[1] & 0x7f;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    payloadLength = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const isMasked = Boolean(buffer[1] & 0x80);
  const mask = isMasked ? buffer.slice(offset, offset + 4) : null;
  offset += isMasked ? 4 : 0;

  const payload = buffer.slice(offset, offset + payloadLength);

  if (isMasked) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= mask[i % 4];
    }
  }

  return {
    opcode,
    payload: payload.toString("utf8"),
  };
};

const listTodos = async () => Todo.find({}, { __v: 0 });

const sendTodos = async (socket) => {
  const todos = await listTodos();
  send(socket, {
    type: "todos:list",
    data: todos,
  });
};

const broadcastTodos = async () => {
  const todos = await listTodos();
  broadcast({
    type: "todos:list",
    data: todos,
  });
};

const handleMessage = async (socket, rawMessage) => {
  let message;

  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    send(socket, {
      type: "error",
      message: "Invalid JSON message",
    });
    return;
  }

  try {
    if (message.type === "todos:list") {
      await sendTodos(socket);
      return;
    }

    if (message.type === "todos:create") {
      const text = message.payload && message.payload.text;

      if (!text || !text.trim()) {
        send(socket, {
          type: "error",
          message: "Todo text is required",
        });
        return;
      }

      await new Todo({ text }).save();
      await broadcastTodos();
      return;
    }

    send(socket, {
      type: "error",
      message: "Unknown message type",
    });
  } catch (error) {
    send(socket, {
      type: "error",
      message: error.message,
    });
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
    sendTodos(socket).catch((error) => {
      send(socket, {
        type: "error",
        message: error.message,
      });
    });

    socket.on("data", (buffer) => {
      const frame = decodeFrame(buffer);

      if (frame.opcode === 0x8) {
        clients.delete(socket);
        socket.end();
        return;
      }

      if (frame.opcode === 0x1) {
        handleMessage(socket, frame.payload);
      }
    });

    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });
};

module.exports = setupWebSocketServer;
