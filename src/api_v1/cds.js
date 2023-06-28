const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");
const githubUtils = require("../utils/github-utils");
const hubspotUtils = require("../utils/hubspot-utils");
const { prepareCDS } = require("../utils/routines");
const {
  slugify,
  CDS_EDITOR_API_ENDPOINT,
  abiToCDS,
  abiInputToField,
  getFunctionSuffix,
  improveCdsWithOpenAI,
} = require("../utils/abi-to-cds-utils");
const axios = require("axios");
require("dotenv").config();

const cds = express.Router();

const { GITHUB_OWNER, GITHUB_REPO } = process.env;

/**
 * GET /api/v1/cds
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
 * @typedef {object} AddConnectorPayloadV1
 * @property {string} cds.required - Connector CDS JSON string.
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} username - Author's GitHub username
 */

/**
 * POST /api/v1/cds
 *
 * @summary Add Connector
 * @description Add a new Connector
 * @tags CDS
 * @security BearerAuth
 * @param {AddConnectorPayloadV1} request.body
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
 * @typedef {object} UpdateConnectorPayloadV1
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} cds.required - Connector CDS JSON string.
 */

/**
 * PATCH /api/v1/cds
 *
 * @summary Update Connector
 * @description Update Connector
 * @tags CDS
 * @security BearerAuth
 * @param {UpdateConnectorPayloadV1} request.body
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
 * GET /api/v1/cds/check/{key}
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
 * @typedef {object} PublishConnectorPayloadV1
 * @property {string} email.required - User email
 * @property {string} connector_name.required - Connector name
 * @property {string} connector_key.required - Connector key
 * @property {string} comment - Comment from user, optional.
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 */

/**
 * POST /api/v1/cds/publish
 *
 * @summary Submit connector for publishing
 * @description Submits HubSpot form.
 * @tags CDS
 * @security BearerAuth
 * @param {PublishConnectorPayloadV1} request.body
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
 * @typedef {object} CloneConnectorPayloadV1
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} cds.required - Connector CDS JSON string.
 * @property {string} username.required - Connector creator's GitHub username.
 */

/**
 * POST /api/v1/cds/clone
 *
 * @summary Clone Connector
 * @description Clone connector CDS.
 * @tags CDS
 * @security BearerAuth
 * @param {CloneConnectorPayloadV1} request.body.required
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
  const { cds, username, environment, enhancedByOpenAI } = req.body;
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

cds.post("/convert", async (req, res) => {
  const { abi, name, icon, description, documentation, enhancedByOpenAI } = req.body;

  const parsedInput = Array.isArray(abi) ? abi : JSON.parse(abi || "[]");
  if (!Array.isArray(parsedInput)) {
    throw Error("Invalid ABI");
  }

  const key = name ? slugify(name.trim()) : slugify("connector_" + new Date().toISOString());

  let isKeyExists;

  try {
    isKeyExists = await axios.get(`${CDS_EDITOR_API_ENDPOINT}/cds/check/${key}`);
  } catch (err) {
    throw Error("We couldn't check if connector name is available. Please, try again later.");
  }

  if (isKeyExists?.data?.result) {
    throw Error("Connector name has already been used. Please, try another name.");
  }

  let cds = {
    key: key,
    name: name || "Connector " + new Date().toISOString(),
    version: "1.0.0",
    platformVersion: "1.0.0",
    type: "web3",
    triggers: parsedInput
      .filter((x) => x.type === "event")
      .map((x) => ({
        ...x,
        inputs: x.inputs.map((x, i) => ({
          ...x,
          name: x.name || "param" + i,
        })),
      }))
      .map((x) => ({
        key: x.name + "Trigger",
        name: abiToCDS(x.name),
        display: {
          label: abiToCDS(x.name),
          description: abiToCDS(x.name),
        },
        operation: {
          type: "blockchain:event",
          signature: `event ${x.name}(${x.inputs
            .map((inp) => `${inp.type} ${inp.indexed ? "indexed " : ""}${inp.name}`)
            .join(", ")})`,
          inputFields: x.inputs.map(abiInputToField),
          outputFields: x.inputs.map(abiInputToField),
          sample: {},
        },
      })),
    actions: parsedInput
      .filter((x) => x.type === "function")
      .map((x) => ({
        ...x,
        inputs: x.inputs.map((x, i) => ({
          ...x,
          name: x.name || "param" + i,
        })),
      }))
      .map((x) => ({
        key: x.name + "Action",
        name: abiToCDS(x.name) + (x.constant ? " (View function)" : ""),
        display: {
          label: abiToCDS(x.name) + (x.constant ? " (View function)" : ""),
          description: abiToCDS(x.name) + (x.constant ? " (View function)" : ""),
        },
        operation: {
          type: "blockchain:call",
          signature: `function ${x.name}(${x.inputs
            .map((inp) => `${inp.type} ${inp.name}`)
            .join(", ")})${getFunctionSuffix(x)}`,
          inputFields: x.inputs.map(abiInputToField).map((x) => ({ ...x, required: true })),
          outputFields:
            (x.constant || x.stateMutability === "pure") && x.outputs.length === 1
              ? [
                  {
                    key: "returnValue",
                    label: "Return value of " + abiToCDS(x.name),
                    type: mapType(x.outputs[0].type),
                  },
                ]
              : [],
          sample: {},
        },
      })),
  };

  cds.description = description ? description : "";

  if (enhancedByOpenAI) {
    for (let i = 0; i < cds.triggers.length; i++) {
      cds.triggers[i] = await improveCdsWithOpenAI(
        `I have developed a Web3 connector that utilizes the ABI of a smart contract to extract its functions and events. These events serve as triggers within my connector, enabling them to initiate subsequent actions. I will provide you with an object representing one of these triggers. Please review the fields within the object, along with the provided documentation (if available), and make the following modifications:

    - Modify the "description" field to provide a concise explanation of the trigger (event) in question.
    - Adjust all "placeholder" fields to offer users more contextual information regarding the expected input.

    Once complete, kindly provide me with the modified object alone, which I will utilize in the subsequent sections of my JavaScript code.

    Below is the trigger object:
    ${JSON.stringify(cds.triggers[i])}

    Associated documentation:
    ${documentation}`,
        true
      );
    }

    for (let i = 0; i < cds.actions.length; i++) {
      cds.actions[i] = await improveCdsWithOpenAI(
        `I have developed a Web3 connector that utilizes the ABI of a smart contract to extract its functions and events. These functions are available as actions within my connector, allowing users to perform various operations within their workflows. I will provide you with an object representing one of these actions. Please review the fields within the object, along with the provided documentation (if available), and make the following modifications:

      - Modify the "description" field to provide a concise explanation of the action (function) in question.
      - Adjust all "placeholder" fields to offer users more contextual information regarding the expected input.

      Once complete, kindly provide me with the modified object alone, which I will utilize in the subsequent sections of my JavaScript code.

      Below is the action object:
      ${JSON.stringify(cds.actions[i])}

      Associated documentation:
      ${documentation}`,
        true
      );
    }

    const cdsClone = { ...cds };
    cdsClone.triggers = cdsClone.triggers.map((trigger) => ({ name: trigger.name }));
    cdsClone.actions = cdsClone.actions.map((action) => ({ name: action.name }));

    cds.description = await improveCdsWithOpenAI(
      `I have developed a Web3 connector that leverages the ABI of a smart contract. By extracting all the events and functions from the ABI, I have created a comprehensive set of triggers and actions, enabling the creation of sophisticated workflows.

    This connector offers a wide range of capabilities, allowing users to seamlessly interact with the smart contract's events and functions. I will provide you with a complete object summarizing all the available triggers and actions, along with any associated documentation (if available).

    Your task is to craft a concise description that captures the essence of this connector's capabilities.

    Please provide a single sentence describing the connector based on the following object:

    Connector object: ${JSON.stringify(cdsClone)}

    Associated documentation: ${documentation}`,
      false
    );
  }

  if (icon) {
    if (icon.startsWith("data:")) {
      cds.icon = icon;
    }
    if (isValidHttpUrl(icon)) {
      cds.icon = await convertImgToBase64Wrapper(icon);
    }
  }

  return res.json(cds);
});

module.exports = cds;
