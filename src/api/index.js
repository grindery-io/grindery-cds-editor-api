const express = require("express"),
  cds = require("./cds"),
  abi = require("./abi"),
  blockchains = require("./blockchains");

const api = express.Router();

api.use("/cds", cds);
api.use("/abi", abi);
api.use("/blockchains", blockchains);

module.exports = api;
