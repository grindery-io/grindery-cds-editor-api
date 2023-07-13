const { default: axios } = require("axios");
const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const contributor = express.Router();

const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET;

/**
 * GET /api/v1/contributor
 *
 * @summary Get contributor
 * @description Get a contributor by userID
 * @tags Contributors
 * @security BearerAuth
 * @param {string} environment.query - One of `production` or `staging`. Default is `production`.
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example response - 200 - Success response example
 * {
 *   "id": "12345",
 *   "username": "user_name",
 *   "url": "https://github.com/user_name",
 *   "avatar": "https://avatars.githubusercontent.com/u/56789?v=4",
 *   "githubId": "56789"
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
contributor.get("/", auth.isRequired, async (req, res) => {
  console.log("get contributor test");
  const { environment } = req.query;
  const userId = res.locals.userId;
  let contributor;
  try {
    contributor = await routines.getContributorByUserId(userId, environment);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  return res.json({
    id: contributor.id,
    username: (contributor.values && contributor.values.github_username) || "",
    url: (contributor.values && contributor.values.github_url) || "",
    avatar: (contributor.values && contributor.values.avatar_url) || "",
    githubId: (contributor.values && contributor.values.user_id) || "",
  });
});

/**
 * Save contributor payload
 * @typedef {object} SaveContributorPayloadV1
 * @property {string} environment - One of `production` or `staging`. Default is `production`.
 * @property {string} code - GitHub authentication code.
 */

/**
 * POST /api/v1/contributor
 *
 * @summary Save contributor
 * @description Authenticate and save GitHub user
 * @tags Contributors
 * @security BearerAuth
 * @param {SaveContributorPayloadV1} request.body
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @return {object} 403 - Authentication error response
 * @example request - payload example
 * {
 *   "environment": "staging",
 *   "code": "12345"
 * }
 * @example response - 200 - Success response example
 * {
 *   "id": "12345",
 *   "username": "user_name",
 *   "url": "https://github.com/user_name",
 *   "avatar": "https://avatars.githubusercontent.com/u/56789?v=4",
 *   "githubId": "56789"
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
contributor.post("/", auth.isRequired, async (req, res) => {
  const { code, environment } = req.body;
  const userId = res.locals.userId;

  let access;

  try {
    access = await axios.post(
      `https://github.com/login/oauth/access_token`,
      {
        client_id: GITHUB_APP_CLIENT_ID,
        client_secret: GITHUB_APP_CLIENT_SECRET,
        code: code || "",
        redirect_uri:
          environment === "staging"
            ? "https://nexus-staging.grindery.org/github/auth"
            : "https://nexus.grindery.org/github/auth",
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  let githubUser;

  try {
    githubUser = await axios.get(`https://api.github.com/user`, {
      headers: {
        Authorization: `Bearer ${(access && access.data && access.data.access_token) || ""}`,
      },
    });
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }

  let contributor;
  try {
    contributor = await routines.createContributor(
      {
        github_username: (githubUser && githubUser.data && githubUser.data.login) || "",
        github_url: (githubUser && githubUser.data && githubUser.data.html_url) || "",
        avatar_url: (githubUser && githubUser.data && githubUser.data.avatar_url) || "",
        user_id: (githubUser && githubUser.data && githubUser.data.id && githubUser.data.id.toString()) || "",
        name: (githubUser && githubUser.data && (githubUser.data.name || githubUser.data.login)) || "",
        bio: (githubUser && githubUser.data && githubUser.data.bio) || "",
        email: (githubUser && githubUser.data && githubUser.data.email) || "",
        location: (githubUser && githubUser.data && githubUser.data.location) || "",
        company: (githubUser && githubUser.data && githubUser.data.company) || "",
        userid: userId,
      },
      environment
    );
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

  return res.json({
    id: contributor.id,
    username: (contributor.values && contributor.values.github_username) || "",
    url: (contributor.values && contributor.values.github_url) || "",
    avatar: (contributor.values && contributor.values.avatar_url) || "",
    githubId: (contributor.values && contributor.values.user_id) || "",
    name: (contributor.values && contributor.values.name) || "",
  });
});

module.exports = contributor;
