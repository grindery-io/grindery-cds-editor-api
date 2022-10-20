const express = require("express"),
  routines = require("./utils/routines"),
  hubspot = require("./utils/hubspot-utils");

const api = express.Router();

api.post("/cds/submit", async (req, res) => {
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
      entry = await routines.createEntry(data.entry);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    let contributor;

    try {
      contributor = await routines.createOrUpdateContributor(data.contributor.username, entry.id);
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

    return res.json({ success: true });
  } else {
    return res.status(400).json({ message: "Bad request" });
  }
});

module.exports = api;
