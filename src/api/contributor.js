const { default: axios } = require("axios");
const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");

const contributor = express.Router();

const GITHUB_APP_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID;
const GITHUB_APP_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET;

contributor.get("/", auth.isRequired, async (req, res) => {
  const { environment } = req.query;
  const userId = res.locals.userId;
  let contributor;
  try {
    contributor = routines.getControbutorByUserId(userId, environment);
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

contributor.post("/", auth.isRequired, async (req, res) => {
  const { code, environment } = req.body;
  const userId = res.locals.userId;

  let access;

  try {
    access = await axios.post(`https://github.com/login/oauth/access_token`, {
      client_id: GITHUB_APP_CLIENT_ID,
      client_secret: GITHUB_APP_CLIENT_SECRET,
      code: code || "",
    });
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
    contributor = routines.createContributor(
      {
        username: (githubUser && githubUser.data && githubUser.data.login) || "",
        github_url: (githubUser && githubUser.data && githubUser.data.html_url) || "",
        avatar_url: (githubUser && githubUser.data && githubUser.data.avatar_url) || "",
        user_id: (githubUser && githubUser.data && githubUser.data.id) || "",
        name: (githubUser && githubUser.data && githubUser.data.name) || "",
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
