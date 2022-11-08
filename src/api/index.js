const express = require("express"),
  cds = require("./cds"),
  abi = require("./abi"),
  blockchains = require("./blockchains"),
  contributor = require("./contributor");

const api = express.Router();

api.use("/cds", cds);
api.use("/abi", abi);
api.use("/blockchains", blockchains);
api.use("/contributor", contributor);

module.exports = api;
