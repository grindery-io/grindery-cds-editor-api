const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const cds = express.Router();

cds.get("/", auth.isRequired, async (req, res) => {
  let rows;
  try {
    rows = await routines.getEntriesByUser(res.locals.userId, res.locals.workspaceId);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: rows });
});

cds.post("/", auth.isRequired, async (req, res) => {
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
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    let contributor;

    try {
      contributor = await routines.createOrUpdateContributor(data.contributor.username, entry.id, res.locals.userId);
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    try {
      await routines.setEntryContributor(entry, contributor);
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    try {
      await routines.publishTables();
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    return res.json({ success: true, id: entry.id });
  } else {
    return res.status(400).json({ message: "Bad request" });
  }
});

cds.patch("/", auth.isRequired, async (req, res) => {
  const { id, cds } = req.body;
  if (cds && id) {
    let entry;

    try {
      entry = await routines.updateEntry({
        id: id,
        cds: cds,
      });
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }
    return res.json({ success: true, id: entry.id });
  } else {
    return res.status(400).json({ message: "Bad request" });
  }
});

cds.get("/check/:key", auth.isRequired, async (req, res) => {
  const { key } = req.params;
  if (!key) {
    return res.status(400).json({ message: "CDS key is required" });
  }
  let isExists;
  try {
    isExists = await routines.isEntryExists(key);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: isExists });
});

module.exports = cds;
