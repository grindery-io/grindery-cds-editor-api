const NexusClient = require("grindery-nexus-client").default;
const { default: axios } = require("axios");
const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const cds = express.Router();

/**
 * GET /api/cds
 *
 * @summary Get Connectors
 * @description Get a list of user's connectors
 * @tags CDS
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

/**
 * Entry
 * @typedef {object} Entry
 * @property {string} cds.required - Connector CDS JSON string.
 * @property {string} abi.required - Smart-contract ABI JSON string.
 * @property {string} name.required - Connector name.
 * @property {string} icon.required - Connector icon, base64 encoded string.
 * @property {string} blockchain.required - Smart-contract blockchain ID
 */

/**
 * Contributor
 * @typedef {object} Contributor
 * @property {string} username.required - GitHub username
 */

/**
 * Data
 * @typedef {object} Data
 * @property {Entry} entry.required
 * @property {Contributor} contributor.required
 */

/**
 * Add Connector payload
 * @typedef {object} AddConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {Data} data.required - Connector data.
 */

/**
 * POST /api/cds
 *
 * @summary Add Connector
 * @description Add a new Connector
 * @tags CDS
 * @security BearerAuth
 * @param {AddConnectorPayload} request.body
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "success": true,
 *   "id": "123"
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

/**
 * Update Connector payload
 * @typedef {object} UpdateConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} id.required - Connector ID.
 * @property {string} cds.required - Connector CDS JSON string.
 */

/**
 * PATCH /api/cds
 *
 * @summary Update Connector
 * @description Update Connector
 * @tags CDS
 * @security BearerAuth
 * @param {UpdateConnectorPayload} request.body
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "success": true,
 *   "id": "123"
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

/**
 * GET /api/cds/check/{key}
 *
 * @summary Check connector
 * @description Check if connector with the `key` exists
 * @tags CDS
 * @security BearerAuth
 * @param {string} environment.query - One of `production` or `staging`. Default is `production`.
 * @param {string} key.path.required - Connector `key`.
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "result": true
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

/**
 * Publish Connector payload
 * @typedef {object} PublishConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 */

/**
 * POST /api/cds/publish/{key}
 *
 * @summary Publish Connector
 * @description Push connector CDS to GitHub.
 * @tags CDS
 * @security BearerAuth
 * @param {string} key.path.required - Connector `key`
 * @param {PublishConnectorPayload} request.body
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "result": {}
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

/**
 * Clone Connector payload
 * @typedef {object} CloneConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} cds.required - Connector CDS JSON string.
 * @property {string} username.required - Connector creator's GitHub username.
 */

/**
 * POST /api/cds/clone
 *
 * @summary Clone Connector
 * @description Clone connector CDS.
 * @tags CDS
 * @security BearerAuth
 * @param {CloneConnectorPayload} request.body.required
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "success": true,
 *   "id": "123",
 *   "key": "connectorKey"
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

/**
 * Connector Delete payload
 * @typedef {object} DeleteConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 */

/**
 * DELETE /api/cds/{key}
 *
 * @summary Delete Connector
 * @description Delete connector CDS
 * @tags CDS
 * @security BearerAuth
 * @param {string} key.path.required - Connector `key`
 * @param {DeleteConnectorPayload} request.body
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "success": true
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
