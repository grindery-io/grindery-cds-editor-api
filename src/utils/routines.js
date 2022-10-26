const hubspot = require("./hubspot-utils");
const github = require("./github-utils");

const HUBSPOT_HUBDB_ENTRIES_TABLE = process.env.HUBSPOT_HUBDB_ENTRIES_TABLE;
const HUBSPOT_HUBDB_CONTRIBUTORS_TABLE = process.env.HUBSPOT_HUBDB_CONTRIBUTORS_TABLE;

function Routines() {}

const self = Routines.prototype;

Routines.prototype.slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

Routines.prototype.createEntry = (entry) => {
  return new Promise((resolve, reject) => {
    hubspot
      .addTableRow(
        HUBSPOT_HUBDB_ENTRIES_TABLE,
        {
          name: entry.name,
          description: entry.description || "",
          contract_address: entry.contract,
          contract_abi: entry.abi,
          cds: entry.cds,
          status: {
            name: "Pending",
            type: "option",
          },
          icon: JSON.parse(entry.cds).icon || "",
          blockchain: [{ id: entry.blockchain, type: "foreignid" }],
        },
        self.slugify(entry.name),
        entry.name
      )
      .then((row) => {
        hubspot
          .publishTable(HUBSPOT_HUBDB_ENTRIES_TABLE)
          .then(() => {
            resolve(row);
          })
          .catch((err) => {
            console.error("createEntry error => ", err.message);
            reject(err);
          });
      })
      .catch((err) => {
        console.error("createEntry error => ", err.message);
        reject(err);
      });
  });
};

Routines.prototype.createOrUpdateContributor = (username, entryId) => {
  return new Promise((resolve, reject) => {
    github
      .getUserByUsername(username)
      .then((githubUser) => {
        hubspot
          .getTableRows(HUBSPOT_HUBDB_CONTRIBUTORS_TABLE, `github_username=${username}`)
          .then((contributors) => {
            hubspot
              .updateTableRow(HUBSPOT_HUBDB_CONTRIBUTORS_TABLE, contributors[0].id, {
                entries: [...contributors[0].values.entries, { id: entryId, type: "foreignid" }],
              })
              .then((updatedContributor) => {
                hubspot
                  .publishTable(HUBSPOT_HUBDB_CONTRIBUTORS_TABLE)
                  .then(() => {
                    resolve(updatedContributor);
                  })
                  .catch((err) => {
                    console.error("createOrUpdateContributor error => ", err.message);
                    reject(err);
                  });
              })
              .catch((err) => {
                console.error("createOrUpdateContributor error => ", err.message);
                reject(err);
              });
          })
          .catch(() => {
            hubspot
              .addTableRow(
                HUBSPOT_HUBDB_CONTRIBUTORS_TABLE,
                {
                  name: githubUser.name,
                  github_username: githubUser.login || username,
                  github_url: githubUser.html_url || "",
                  avatar_url: githubUser.avatar_url || "",
                  bio: githubUser.bio || "",
                  location: githubUser.location || "",
                  user_id: (githubUser.id || "").toString(),
                  company: githubUser.company || "",
                  entries: [{ id: entryId, type: "foreignid" }],
                },
                username,
                githubUser.name
              )
              .then((createdContributor) => {
                hubspot
                  .publishTable(HUBSPOT_HUBDB_CONTRIBUTORS_TABLE)
                  .then(() => {
                    resolve(createdContributor);
                  })
                  .catch((err) => {
                    console.error("createOrUpdateContributor error => ", err.message);
                    reject(err);
                  });
              })
              .catch((err) => {
                console.error("createOrUpdateContributor error => ", err);
                reject(err);
              });
          });
      })
      .catch((err) => {
        console.error("createOrUpdateContributor error => ", err.message);
        reject(err);
      });
  });
};

Routines.prototype.setEntryContributor = (entry, contributor) => {
  return new Promise((resolve, reject) => {
    hubspot
      .updateTableRow(HUBSPOT_HUBDB_ENTRIES_TABLE, entry.id, {
        contributor: [{ id: contributor.id, type: "foreignid" }],
      })
      .then((updatedEntry) => {
        resolve(updatedEntry);
      })
      .catch((err) => {
        console.error("setEntryContributor error => ", err.message);
        reject(err);
      });
  });
};

Routines.prototype.publishTables = () => {
  return new Promise((resolve, reject) => {
    hubspot
      .publishTable(HUBSPOT_HUBDB_ENTRIES_TABLE)
      .then(() => {
        hubspot
          .publishTable(HUBSPOT_HUBDB_CONTRIBUTORS_TABLE)
          .then(() => {
            resolve(true);
          })
          .catch((err) => {
            console.error("publishTables error => ", err.message);
            reject(err);
          });
      })
      .catch((err) => {
        console.error("publishTables error => ", err.message);
        reject(err);
      });
  });
};

module.exports = new Routines();