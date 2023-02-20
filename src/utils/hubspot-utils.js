const axios = require("axios");

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HS_API_PATH = "https://api.hubapi.com/cms/v3";
const HUBSPOT_PORTAL = process.env.HUBSPOT_PORTAL;
const HUBSPOT_PUBLISH_FORM_ID = process.env.HUBSPOT_PUBLISH_FORM_ID;

function HubspotUtils() {}

const self = HubspotUtils.prototype;

HubspotUtils.prototype.getTableRows = (tableID, filters) => {
  return new Promise((resolve, reject) => {
    let rows = [];
    axios
      .get(`${HS_API_PATH}/hubdb/tables/${tableID}/rows?${filters}`, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        rows = (res && res.data && res.data.results) || [];
        resolve(rows);
      })
      .catch((err) => {
        console.error("getTableRows error => ", err.message);
        reject(err);
      });
  });
};

HubspotUtils.prototype.getTableRowsByIds = (tableID, rowsId) => {
  return new Promise((resolve, reject) => {
    let rows = [];
    axios
      .post(
        `${HS_API_PATH}/hubdb/tables/${tableID}/rows/batch/read`,
        {
          inputs: rowsId,
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        rows = (res && res.data && res.data.results) || [];
        resolve(rows);
      })
      .catch((err) => {
        console.error("getTableRows error => ", err.message);
        reject(err);
      });
  });
};

HubspotUtils.prototype.addTableRow = (tableID, values, path, name) => {
  return new Promise((resolve, reject) => {
    let row = {};
    const data = {
      values,
    };
    if (name) {
      data.name = name;
    }
    if (path) {
      data.path = path;
    }
    axios
      .post(`${HS_API_PATH}/hubdb/tables/${tableID}/rows`, data, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        row = (res && res.data) || {};
        resolve(row);
      })
      .catch((err) => {
        console.error("addTableRow error => ", err.message);
        reject(err);
      });
  });
};

HubspotUtils.prototype.updateTableRow = (tableID, rowId, values, path, name) => {
  return new Promise((resolve, reject) => {
    let row = {};
    const data = {
      values,
    };
    if (name) {
      data.name = name;
    }
    if (path) {
      data.path = path;
    }
    axios
      .patch(`${HS_API_PATH}/hubdb/tables/${tableID}/rows/${rowId}/draft`, data, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        row = (res && res.data) || {};
        resolve(row);
      })
      .catch((err) => {
        console.error("updateTableRow error => ", err);
        reject(err);
      });
  });
};

HubspotUtils.prototype.publishTable = (tableID) => {
  return new Promise((resolve, reject) => {
    let table = {};
    axios
      .post(
        `${HS_API_PATH}/hubdb/tables/${tableID}/draft/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      )
      .then((res) => {
        table = (res && res.data) || {};
        resolve(table);
      })
      .catch((err) => {
        console.error("publishTable error => ", err.message);
        reject(err);
      });
  });
};

HubspotUtils.prototype.deleteTableRow = (tableID, rowId) => {
  return new Promise((resolve, reject) => {
    axios
      .delete(`${HS_API_PATH}/hubdb/tables/${tableID}/rows/${rowId}/draft`, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      })
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        console.error("deleteTableRow error => ", err.message);
        reject(err);
      });
  });
};

HubspotUtils.prototype.submitForm = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(`https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL}/${HUBSPOT_PUBLISH_FORM_ID}`, {
        fields: Object.keys(data).map((key) => ({
          name: key,
          value: data[key],
        })),
      })
      .then((res) => {
        resolve(res.data);
      })
      .catch((error) => {
        console.log("submitForm error:", error);
        reject(error);
      });
  });
};

module.exports = new HubspotUtils();
