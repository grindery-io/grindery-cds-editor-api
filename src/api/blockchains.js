const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const blockchains = express.Router();

blockchains.get("/", auth.isRequired, async (req, res) => {
  let rows;
  try {
    rows = await routines.getBlockchains();
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: rows });
});

module.exports = blockchains;
