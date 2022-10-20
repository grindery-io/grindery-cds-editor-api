const axios = require("axios");

const GITHUB_API_PATH = "https://api.github.com";

function GithubUtils() {}

const self = GithubUtils.prototype;

GithubUtils.prototype.getUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    let user = {};
    axios
      .get(`${GITHUB_API_PATH}/users/${username}`)
      .then((res) => {
        user = (res && res.data) || {};
        resolve(user);
      })
      .catch((err) => {
        console.error("getUserByUsername error => ", err.message);
        reject(err);
      });
  });
};

module.exports = new GithubUtils();
