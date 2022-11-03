const routines = require("./utils/routines");

routines.publishPendingConnectors("staging").catch((err) => {
  console.error("pending staging connectors publishing failed", err);
});
