const authHandlers = require("./auth");
const profileHandlers = require("./profile");
const discoverHandlers = require("./discover");
const swipeHandlers = require("./swipe");
const matchesHandlers = require("./matches");
const chatHandlers = require("./chat");

const PUBLIC = {
  register: authHandlers.register,
  auth: authHandlers.auth,
};

const AUTHED = {
  "profile:get": profileHandlers.get,
  "profile:update": profileHandlers.update,
  "discover:list": discoverHandlers.list,
  swipe: swipeHandlers.swipe,
  "matches:list": matchesHandlers.list,
  "chat:schedule": chatHandlers.schedule,
  "chat:join": chatHandlers.join,
  "chat:message": chatHandlers.message,
  "chat:extend": chatHandlers.extend,
  "chat:end": chatHandlers.end,
};

module.exports = { PUBLIC, AUTHED };
