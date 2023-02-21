const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");
const githubUtils = require("../utils/github-utils");
const hubspotUtils = require("../utils/hubspot-utils");
const { prepareCDS } = require("../utils/routines");

const cds = express.Router();

const { GITHUB_OWNER, GITHUB_REPO } = process.env;

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

  const connectors = await routines.getGithubConnectorsURLs({ environment });

  const allConnectors = await Promise.all(
    connectors.map((url) =>
      githubUtils
        .request(url)
        .then((file) => {
          if (file && file.content) {
            return JSON.parse(Buffer.from(file.content, file.encoding).toString());
          } else {
            return {};
          }
        })
        .catch((error) => {
          console.log("error", error);
          return {};
        })
    )
  );

  const userConnectors = allConnectors.filter(
    (connector) =>
      connector &&
      connector.type &&
      connector.type === "web3" &&
      ((!res.locals.workspaceId &&
        connector.user === res.locals.userId &&
        (!connector.workspace || connector.workspace === res.locals.userId)) ||
        (res.locals.workspaceId && connector.workspace === res.locals.workspaceId))
  );

  return res.json({ result: userConnectors });
});

/**
 * Add Connector payload
 * @typedef {object} AddConnectorPayload
 * @property {string} cds.required - Connector CDS JSON string.
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} username - Author's GitHub username
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
  const { cds, username, environment } = req.body;
  if (!cds) {
    return res.status(400).json({ message: "Bad request" });
  }

  const preparedCDS = routines.prepareCDS({ cds, access: "Private", username, res });

  let connector;

  try {
    connector = await routines.createConnector({ cds: preparedCDS, environment });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ success: true, id: preparedCDS.key });
});

/**
 * Update Connector payload
 * @typedef {object} UpdateConnectorPayload
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
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
  const { cds, environment } = req.body;
  if (!cds) {
    return res.status(400).json({ message: "Bad request" });
  }

  const preparedCDS = routines.prepareCDS({ cds, res });

  let connector;

  try {
    connector = await routines.updateConnector({ cds: preparedCDS, environment });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ success: true, id: preparedCDS.key });
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

  const connectors = await routines.getGithubConnectorsKeys({ environment });

  return res.json({ result: connectors.includes(key) });
});

/**
 * Publish Connector payload
 * @typedef {object} PublishConnectorPayload
 * @property {string} email.required - User email
 * @property {string} connector_name.required - Connector name
 * @property {string} connector_key.required - Connector key
 * @property {string} comment - Comment from user, optional.
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 */

/**
 * POST /api/cds/publish/{key}
 *
 * @summary Submit connector for publishing
 * @description Submits HubSpot form.
 * @tags CDS
 * @security BearerAuth
 * @param {PublishConnectorPayload} request.body
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
cds.post("/publish", auth.isRequired, async (req, res) => {
  const { email, connector_name, connector_key, comment, environment } = req.body;
  if (!connector_key) {
    return res.status(400).json({ message: "Connector key is required" });
  }
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    await hubspotUtils.submitForm({
      ceramic_did: res.locals.userId || "",
      email,
      connector_name,
      connector_link: `https://github.com/grindery-io/grindery-nexus-schema-v2/blob/${
        environment === "staging" ? "staging" : "master"
      }/cds/web3/${connector_key}.json`,
      connector_publishing_comment: comment || "",
    });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  // Get connector
  let connector;
  try {
    connector = await githubUtils.getContent(
      GITHUB_OWNER,
      GITHUB_REPO,
      `cds/web3/${connector_key}.json?ref=${environment === "staging" ? "staging" : "master"}`
    );
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  if (!connector || !connector.content) {
    return res.status(400).json({ message: "Server error" });
  }

  const cds = JSON.parse(Buffer.from(connector.content, connector.encoding).toString());

  try {
    await routines.updateConnector({ cds: { ...cds, submitted: true }, environment });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ result: true });
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

  const readyCDS = prepareCDS({
    cds: JSON.stringify({
      ...connector,
      key,
      name,
      user: res.locals.userId || "",
      workspace: res.locals.workspaceId || res.locals.userId || "",
      contributor: username,
    }),
    access: "Private",
    username,
    res,
  });

  try {
    await routines.createConnector({ cds: readyCDS, environment });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({ success: true, id: readyCDS.key, key: readyCDS.key, connector: readyCDS });
});

module.exports = cds;
