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
      !data.entry.blockchain
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
            cds: JSON.stringify({
              ...JSON.parse(cds),
              user: res.locals.userId,
              workspace: res.locals.workspaceId || undefined,
            }),
            status: {
              name: "Draft",
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
    connector = await routines.getEntryByPath(key, environment, "cds,workspace,user");
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

  let published;

  try {
    published = await routines.publishCdsToGithub(JSON.parse(cds), environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  let result;

  try {
    result = await routines.updateEntry(
      {
        id: connector.id,
        values: {
          status: {
            name: "Published",
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

cds.post("/clone", auth.isRequired, async (req, res) => {
  const { cds, username, environment } = req.body;
  if (!cds) {
    return res.status(400).json({ message: "Connector definition json string is required" });
  }
  if (!username) {
    return res.status(400).json({ message: "GitHub username is required" });
  }

  const connector = JSON.parse(cds);

  let key = connector.key;

  if (/(_clone_)[0-9]+$/.test(key)) {
    key = key.replace(/(_clone_)[0-9]+$/, `_clone_${Math.floor(Date.now() / 1000)}`);
  } else {
    key = `${key}_clone_${Math.floor(Date.now() / 1000)}`;
  }

  const name = connector.name ? `${connector.name} clone` : "";

  const data = {
    cds: JSON.stringify({ ...connector, key, name }),
    name,
    icon: connector.icon || "",
    description: connector.description || "",
    user: res.locals.userId || "",
    workspace: res.locals.workspaceId || "",
  };

  if (!data.name) {
    return res.status(400).json({ message: "Connector name is required" });
  }

  let entry;

  try {
    entry = await routines.createEntry(
      {
        ...data,
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
    contributor = await routines.createOrUpdateContributor(username, entry.id, res.locals.userId, environment);
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

  return res.json({ success: true, id: entry.id, key });
});

cds.delete("/:key", auth.isRequired, async (req, res) => {
  const { key } = req.params;
  const { environment } = req.query;
  if (!key) {
    return res.status(400).json({ message: "Connector key is required" });
  }

  let connector;
  try {
    connector = await routines.getEntryByPath(key, environment, "status,workspace,user");
  } catch (err) {
    return res.status(400).json({
      message: (err && err.response && err.response.data && err.response.data.message) || err.message,
    });
  }

  if (!connector) {
    return res.status(404).json({ message: `Connector not found` });
  }

  if (
    connector &&
    connector.values &&
    connector.values.status &&
    connector.values.status.name &&
    connector.values.status.name === "Published"
  ) {
    return res.status(403).json({ message: `Published connector can't be deleted` });
  }

  if (connector.values.workspace && connector.values.workspace !== res.locals.workspaceId) {
    return res.status(403).json({ message: "You don't have access to this connector" });
  }

  if (!connector.values.workspace && connector.values.user && connector.values.user !== res.locals.userId) {
    return res.status(403).json({ message: "You don't have access to this connector" });
  }

  let deleted;

  try {
    deleted = await routines.deleteEntry(connector.id, environment);
  } catch (err) {
    return res.status(400).json({
      message: (err && err.response && err.response.data && err.response.data.message) || err.message,
    });
  }

  try {
    await routines.publishTables(environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ success: deleted });
});

module.exports = cds;
