/**
 * Created by Syed Afzal
 */
require("./config/config");

const http = require("http");
const express = require("express");
const db = require("./db");
const setupWebSocketServer = require("./websocket");
const { log } = require("./utils/logger");

const app = express();
const server = http.createServer(app);

//connection from db here
db.connect(app);

app.use((req, res) => {
  log("HTTP", "426", {
    method: req.method,
    url: req.url,
    remote: `${req.socket.remoteAddress}:${req.socket.remotePort}`,
    xff: req.headers["x-forwarded-for"],
  });
  res.status(426).json({
    success: false,
    message: "Use the WebSocket endpoint at /ws",
  });
});

setupWebSocketServer(server);

app.on("ready", () => {
  server.listen(3000, () => {
    console.log("Server is up on port", 3000);
    console.log("WebSocket endpoint is available on /ws");
  });
});

module.exports = app;
