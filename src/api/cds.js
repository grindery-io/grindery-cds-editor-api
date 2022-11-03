const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const cds = express.Router();

cds.get("/", auth.isRequired, async (req, res) => {
  const { environment } = req.query;
  let rows;
  try {
    rows = await routines.getEntriesByUser(res.locals.userId, res.locals.workspaceId, environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: rows });
});

cds.post("/", auth.isRequired, async (req, res) => {
  const { data, environment } = req.body;
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
      entry = await routines.createEntry(
        {
          ...data.entry,
          user: res.locals.userId,
          workspace: res.locals.workspaceId || "",
        },
        environment
      );
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    let contributor;

    try {
      contributor = await routines.createOrUpdateContributor(
        data.contributor.username,
        entry.id,
        res.locals.userId,
        environment
      );
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    try {
      await routines.setEntryContributor(entry, contributor, environment);
    } catch (err) {
      return res
        .status(400)
        .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
    }

    try {
      await routines.publishTables(environment);
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
  const { id, cds, environment } = req.body;
  if (cds && id) {
    let entry;

    try {
      entry = await routines.updateEntry(
        {
          id: id,
          values: {
            cds: cds,
          },
        },
        environment
      );
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

cds.get("/check/:key", async (req, res) => {
  const { key } = req.params;
  const { environment } = req.query;
  if (!key) {
    return res.status(400).json({ message: "Connector key is required" });
  }
  let isExists;
  try {
    isExists = await routines.isEntryExists(key, environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: isExists });
});

cds.post("/publish/:key", auth.isRequired, async (req, res) => {
  const { key } = req.params;
  const { environment } = req.body;
  if (!key) {
    return res.status(400).json({ message: "Connector key is required" });
  }
  let connector;
  try {
    connector = await routines.getEntryByPath(key, environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  const cds = connector && connector.values && connector.values.cds;
  if (!cds) {
    return res.status(400).json({ message: "Connector not found" });
  }

  if (connector.values.workspace && connector.values.workspace !== res.locals.workspaceId) {
    return res.status(403).json({ message: "You don't have access to this connector" });
  }

  if (!connector.values.workspace && connector.values.user && connector.values.user !== res.locals.userId) {
    return res.status(403).json({ message: "You don't have access to this connector" });
  }

  let result;

  try {
    result = await routines.updateEntry(
      {
        id: connector.id,
        values: {
          status: {
            name: "Pending",
            type: "option",
          },
        },
      },
      environment
    );
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ result });
});

module.exports = cds;
