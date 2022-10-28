const express = require("express"),
  routines = require("./utils/routines"),
  abiUtils = require("./utils/abi-utils"),
  auth = require("./utils/auth-utils");

const api = express.Router();

api.get("/cds", auth.isRequired, async (req, res) => {
  let rows;
  try {
    rows = await routines.getEntriesByUser(res.locals.userId, res.locals.workspaceId);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  return res.json({ result: rows });
});

api.post("/cds", auth.isRequired, async (req, res) => {
  const { data } = req.body;
  if (data) {
    if (
      !data.entry ||
      !data.entry.cds ||
      !data.entry.abi ||
      !data.entry.name ||
      !data.entry.icon ||
      !data.entry.blockchain ||
      !data.entry.contract
    ) {
      return res.status(400).json({ message: "Bad request" });
    }
    if (!data.contributor || !data.contributor.username) {
      return res.status(400).json({ message: "Bad request" });
    }

    let entry;

    try {
      entry = await routines.createEntry({
        ...data.entry,
        user: res.locals.userId,
        workspace: res.locals.workspaceId || "",
      });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    let contributor;

    try {
      contributor = await routines.createOrUpdateContributor(data.contributor.username, entry.id, res.locals.userId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      await routines.setEntryContributor(entry, contributor);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      await routines.publishTables();
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    return res.json({ success: true, id: entry.id });
  } else {
    return res.status(400).json({ message: "Bad request" });
  }
});

api.get("/abi", async (req, res) => {
  const { blockchain, address } = req.query;
  if (!blockchain) {
    return res.status(400).json({ message: "Blockchain is required" });
  }
  if (!address) {
    return res.status(400).json({ message: "Contract address is required" });
  }

  let getAbiFunction;

  switch (blockchain) {
    case "eip155:1":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:137":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:100":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:42161":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:43114":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:56":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:1666600000":
      getAbiFunction = abiUtils.getHarmonyAbi;
      break;
    default:
      return res.status(404).json({ message: "Chain is not supported" });
  }

  let abi;
  try {
    abi = await getAbiFunction(blockchain, address);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  return res.json({ result: abi });
});

api.get("/blockchains", auth.isRequired, async (req, res) => {
  let rows;
  try {
    rows = await routines.getBlockchains();
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  return res.json({ result: rows });
});

module.exports = api;
