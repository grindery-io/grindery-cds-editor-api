const routines = require("./utils/routines");

routines.publishPendingConnectors().catch((err) => {
  console.error("pending connectors publishing failed", err);
});
