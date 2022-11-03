const axios = require("axios");

const GITHUB_API_PATH = "https://api.github.com";
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;

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

GithubUtils.prototype.getLastCommitSHA = (owner, repo, branch) => {
  return new Promise((resolve, reject) => {
    let last_commit_sha;
    axios
      .get(`${GITHUB_API_PATH}/repos/${owner}/${repo}/branches/${branch}`, {
        headers: {
          Authorization: `Bearer ${GITHUB_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        last_commit_sha = (res && res.data && res.data.commit && res.data.commit.sha) || "";
        resolve(last_commit_sha);
      })
      .catch((err) => {
        console.error("getLastCommitSHA error => ", err.message);
        reject(err);
      });
  });
};

GithubUtils.prototype.createBlob = (owner, repo, content, encoding) => {
  return new Promise((resolve, reject) => {
    let sha;
    axios
      .post(
        `${GITHUB_API_PATH}/repos/${owner}/${repo}/git/blobs`,
        {
          content,
          encoding,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        sha = (res && res.data && res.data.sha) || "";
        resolve(sha);
      })
      .catch((err) => {
        console.error("createBlob error => ", err.message);
        reject(err);
      });
  });
};

GithubUtils.prototype.createTree = (owner, repo, base_tree, tree) => {
  return new Promise((resolve, reject) => {
    let sha;
    axios
      .post(
        `${GITHUB_API_PATH}/repos/${owner}/${repo}/git/trees`,
        {
          base_tree,
          tree,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        sha = (res && res.data && res.data.sha) || "";
        resolve(sha);
      })
      .catch((err) => {
        console.error("createTree error => ", err.message);
        reject(err);
      });
  });
};

GithubUtils.prototype.createCommit = (owner, repo, message, author, parents, tree) => {
  return new Promise((resolve, reject) => {
    let sha;
    axios
      .post(
        `${GITHUB_API_PATH}/repos/${owner}/${repo}/git/commits`,
        {
          message,
          author,
          parents,
          tree,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        sha = (res && res.data && res.data.sha) || "";
        resolve(sha);
      })
      .catch((err) => {
        console.error("createCommit error => ", err.message);
        reject(err);
      });
  });
};

GithubUtils.prototype.updateRef = (owner, repo, ref, sha) => {
  return new Promise((resolve, reject) => {
    let result;
    axios
      .post(
        `${GITHUB_API_PATH}/repos/${owner}/${repo}/git/${ref}`,
        {
          ref,
          sha,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        result = (res && res.data && res.data) || "";
        resolve(sha);
      })
      .catch((err) => {
        console.error("updateRef error => ", err.message);
        reject(err);
      });
  });
};

module.exports = new GithubUtils();
