const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const blockchains = express.Router();

/**
 * GET /api/v1/blockchains
 *
 * @summary Get blockchains
 * @description Get list of supported blockchains
 * @tags Blockchains
 * @security BearerAuth
 * @param {string} environment.query - One of `production` or `staging`. Default is `production`.
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "result": []
 * }
 * @example response - 400 - Error response example
 * {
 *   "message": "Error message"
 * }
 * @example response - 403 - Authentication error response
 * {
 *   "message": "No credentials sent"
 * }
 */
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
