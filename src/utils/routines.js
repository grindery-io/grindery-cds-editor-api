const hubspot = require("./hubspot-utils");
const github = require("./github-utils");
const githubUtils = require("./github-utils");
const jsonFormat = require("json-format");

const {
  HUBSPOT_HUBDB_ENTRIES_TABLE,
  HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING,
  HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
  HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING,
  HUBSPOT_HUBDB_BLOCKCHAINS_TABLE,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH,
  GITHUB_STAGING_BRANCH,
  GITHUB_AUTHOR_NAME,
  GITHUB_AUTHOR_EMAIL,
  GITHUB_WEB3_CONNECTORS_PATH,
} = process.env;

function Routines() {}

const self = Routines.prototype;

Routines.prototype.slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

Routines.prototype.createEntry = (entry, environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .addTableRow(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        {
          name: entry.name,
          description: JSON.parse(entry.cds).description || entry.description || "",
          contract_address: entry.contract || "",
          contract_abi: entry.abi || "",
          cds: JSON.stringify({
            ...JSON.parse(entry.cds),
            user: entry.user || undefined,
            workspace: entry.workspace || undefined,
          }),
          status: {
            name: "Draft",
            type: "option",
          },
          icon: JSON.parse(entry.cds).icon || "",
          blockchain: entry.blockchain ? [{ id: entry.blockchain, type: "foreignid" }] : [],
          user: entry.user,
          workspace: entry.workspace,
          type: JSON.parse(entry.cds).access || "Private",
        },
        entry.cds ? JSON.parse(entry.cds).key : self.slugify(entry.name),
        entry.name
      )
      .then((row) => {
        hubspot
          .publishTable(
            environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE
          )
          .then(() => {
            resolve(row);
          })
          .catch((err) => {
            console.error("createEntry error => ", (err && err.response && err.response.data) || err.message);
            reject(err);
          });
      })
      .catch((err) => {
        console.error("createEntry error => ", (err && err.response && err.response.data) || err.message);
        reject(err);
      });
  });
};

Routines.prototype.updateEntry = (entry, environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .updateTableRow(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        entry.id,
        entry.values
      )
      .then((updatedEntry) => {
        hubspot
          .publishTable(
            environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE
          )
          .then(() => {
            resolve(updatedEntry);
          })
          .catch((err) => {
            console.error("updateEntry error => ", (err && err.response && err.response.data) || err.message);
            reject(err);
          });
      })
      .catch((err) => {
        console.error("updateEntry error => ", (err && err.response && err.response.data) || err.message);
        reject(err);
      });
  });
};

Routines.prototype.createOrUpdateContributor = (username, entryId, userId, environment) => {
  return new Promise((resolve, reject) => {
    github
      .getUserByUsername(username)
      .then((githubUser) => {
        hubspot
          .getTableRows(
            environment && environment === "staging"
              ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
              : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
            `github_username=${username}`
          )
          .then((contributors) => {
            hubspot
              .updateTableRow(
                environment && environment === "staging"
                  ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
                  : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
                contributors[0].id,
                {
                  entries: [...contributors[0].values.entries, { id: entryId, type: "foreignid" }],
                  userid: userId,
                }
              )
              .then((updatedContributor) => {
                hubspot
                  .publishTable(
                    environment && environment === "staging"
                      ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
                      : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE
                  )
                  .then(() => {
                    resolve(updatedContributor);
                  })
                  .catch((err) => {
                    console.error(
                      "createOrUpdateContributor error => ",
                      (err && err.response && err.response.data) || err.message
                    );
                    reject(err);
                  });
              })
              .catch((err) => {
                console.error(
                  "createOrUpdateContributor error => ",
                  (err && err.response && err.response.data) || err.message
                );
                reject(err);
              });
          })
          .catch(() => {
            hubspot
              .addTableRow(
                environment && environment === "staging"
                  ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
                  : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
                {
                  name: githubUser.name || username || "",
                  github_username: githubUser.login || username || "",
                  github_url: githubUser.html_url || "",
                  avatar_url: githubUser.avatar_url || "",
                  bio: githubUser.bio || "",
                  location: githubUser.location || "",
                  user_id: (githubUser.id || "").toString(),
                  company: githubUser.company || "",
                  entries: [{ id: entryId, type: "foreignid" }],
                  userid: userId,
                },
                username || "",
                githubUser.name || username || ""
              )
              .then((createdContributor) => {
                hubspot
                  .publishTable(
                    environment && environment === "staging"
                      ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
                      : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE
                  )
                  .then(() => {
                    resolve(createdContributor);
                  })
                  .catch((err) => {
                    console.error(
                      "createOrUpdateContributor error => ",
                      (err && err.response && err.response.data) || err.message
                    );
                    reject(err);
                  });
              })
              .catch((err) => {
                console.error(
                  "createOrUpdateContributor error => ",
                  (err && err.response && err.response.data) || err.message
                );
                reject(err);
              });
          });
      })
      .catch((err) => {
        console.error("createOrUpdateContributor error => ", (err && err.response && err.response.data) || err.message);
        reject(err);
      });
  });
};

Routines.prototype.setEntryContributor = (entry, contributor, environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .updateTableRow(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        entry.id,
        {
          contributor: [{ id: contributor.id, type: "foreignid" }],
        }
      )
      .then((updatedEntry) => {
        resolve(updatedEntry);
      })
      .catch((err) => {
        console.error("setEntryContributor error => ", (err && err.response && err.response.data) || err.message);
        reject(err);
      });
  });
};

Routines.prototype.publishTables = (environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .publishTable(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE
      )
      .then(() => {
        hubspot
          .publishTable(
            environment && environment === "staging"
              ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
              : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE
          )
          .then(() => {
            resolve(true);
          })
          .catch((err) => {
            console.error("publishTables error => ", (err && err.response && err.response.data) || err.message);
            reject(err);
          });
      })
      .catch((err) => {
        console.error("publishTables error => ", (err && err.response && err.response.data) || err.message);
        reject(err);
      });
  });
};

Routines.prototype.getEntriesByUser = (user, workspace, environment) => {
  return new Promise((resolve, reject) => {
    const query =
      workspace && workspace !== "personal" ? `workspace=${workspace}` : user ? `user=${user}&workspace__is_null=` : "";
    hubspot
      .getTableRows(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        query
      )
      .then((rows) => {
        hubspot
          .getTableRowsByIds(
            environment && environment === "staging"
              ? HUBSPOT_HUBDB_CONTRIBUTORS_TABLE_STAGING
              : HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
            rows
              .filter(
                (row) =>
                  row &&
                  row.values &&
                  row.values.contributor &&
                  row.values.contributor[0] &&
                  row.values.contributor[0].id
              )
              .map((row) => row.values.contributor[0].id)
          )
          .then((contributors) => {
            resolve(
              rows.map((row) => ({
                ...row,
                values: {
                  ...row.values,
                  contributor: [
                    ...(row.values.contributor
                      ? row.values.contributor.map((contributor) => ({
                          ...contributor,
                          values: contributors.find((c) => c.id === contributor.id)
                            ? { ...contributors.find((c) => c.id === contributor.id).values, entries: [] }
                            : {},
                        }))
                      : []),
                  ],
                },
              }))
            );
          })
          .catch((err) => {
            console.error("Contributors enrichment failed", err);
            resolve(rows);
          });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

Routines.prototype.getBlockchains = () => {
  return new Promise((resolve, reject) => {
    hubspot
      .getTableRows(HUBSPOT_HUBDB_BLOCKCHAINS_TABLE, "orderBy=name&limit=1000")
      .then((rows) => {
        resolve(rows);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

Routines.prototype.isEntryExists = (path, environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .getTableRows(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        `hs_path=${path}&properties=name`
      )
      .then((rows) => {
        resolve(Boolean(rows && rows.length && rows.length > 0));
      })
      .catch((err) => {
        reject(err);
      });
  });
};

Routines.prototype.publishCdsToGithub = (cds, environment) => {
  return new Promise((resolve, reject) => {
    githubUtils
      .getLastCommitSHA(
        GITHUB_OWNER,
        GITHUB_REPO,
        environment && environment === "staging" ? GITHUB_STAGING_BRANCH : GITHUB_BRANCH
      )
      .then((lastCommitSha) => {
        githubUtils
          .createBlob(
            GITHUB_OWNER,
            GITHUB_REPO,
            Buffer.from(
              jsonFormat(cds, {
                type: "space",
                size: 2,
              })
            ).toString("base64"),
            "base64"
          )
          .then((blobSha) => {
            githubUtils
              .createTree(GITHUB_OWNER, GITHUB_REPO, lastCommitSha, [
                { path: `${GITHUB_WEB3_CONNECTORS_PATH}/${cds.key}.json`, mode: "100644", sha: blobSha },
              ])
              .then((treeSha) => {
                githubUtils
                  .createCommit(
                    GITHUB_OWNER,
                    GITHUB_REPO,
                    `${cds.name} web3 connector updated via Nexus Developer Portal`,
                    {
                      name: GITHUB_AUTHOR_NAME,
                      email: GITHUB_AUTHOR_EMAIL,
                    },
                    [lastCommitSha],
                    treeSha
                  )
                  .then((newCommitSha) => {
                    githubUtils
                      .updateRef(
                        GITHUB_OWNER,
                        GITHUB_REPO,
                        `refs/heads/${
                          environment && environment === "staging" ? GITHUB_STAGING_BRANCH : GITHUB_BRANCH
                        }`,
                        newCommitSha
                      )
                      .then((result) => {
                        resolve(result);
                      })
                      .catch((err) => {
                        reject(err);
                      });
                  })
                  .catch((err) => {
                    reject(err);
                  });
              })
              .catch((err) => {
                reject(err);
              });
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

Routines.prototype.getEntryByPath = (path, environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .getTableRows(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        `hs_path=${path}&properties=cds`
      )
      .then((rows) => {
        resolve((rows && rows[0]) || null);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

Routines.prototype.publishPendingConnectors = (environment) => {
  return new Promise((resolve, reject) => {
    hubspot
      .getTableRows(
        environment && environment === "staging" ? HUBSPOT_HUBDB_ENTRIES_TABLE_STAGING : HUBSPOT_HUBDB_ENTRIES_TABLE,
        `status=Pending&properties=cds&limit=1`
      )
      .then((rows) => {
        if (rows && rows[0] && rows[0].values && rows[0].values.cds) {
          self
            .publishCdsToGithub(JSON.parse(rows[0].values.cds), "staging")
            .then(() => {
              self
                .updateEntry(
                  {
                    id: rows[0].id,
                    values: {
                      status: {
                        name: "Published",
                        type: "option",
                      },
                    },
                  },
                  environment
                )
                .then(() => {
                  resolve({ success: true });
                })
                .catch((err) => {
                  reject(err);
                });
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          resolve({ success: true });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

module.exports = new Routines();
