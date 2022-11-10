const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const blockchains = express.Router();

blockchains.get("/", auth.isRequired, async (req, res) => {
  const { environment } = req.query;
  let rows;
  try {
    rows = await routines.getBlockchains(environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: rows });
});

module.exports = blockchains;
