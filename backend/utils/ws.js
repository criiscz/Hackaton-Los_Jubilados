const { log } = require("./logger");

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

  return { opcode, payload: payload.toString("utf8") };
};

const send = (socket, message) => {
  if (socket && !socket.destroyed) {
    log("WS->", {
      remote: socket.remoteAddr,
      userId: socket.userId || null,
      type: message && message.type,
    });
    socket.write(encodeFrame(JSON.stringify(message)));
  }
};

const sendError = (socket, type, message, extra = {}) => {
  send(socket, { type: "error", inReplyTo: type, message, ...extra });
};

module.exports = { encodeFrame, decodeFrame, send, sendError };
