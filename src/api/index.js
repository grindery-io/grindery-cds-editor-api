const express = require("express"),
  cds = require("./cds"),
  abi = require("./abi"),
  blockchains = require("./blockchains"),
  contributor = require("./contributor"),
  notifications = require("./notifications");

const api = express.Router();

api.use("/cds", cds);
api.use("/abi", abi);
api.use("/blockchains", blockchains);
api.use("/contributor", contributor);
api.use("/notifications", notifications);

module.exports = api;
