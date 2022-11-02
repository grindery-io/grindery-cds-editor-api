const express = require("express"),
  bodyParser = require("body-parser"),
  sslRedirect = require("heroku-ssl-redirect"),
  api = require("./api/index");

const app = express();

app.set("trust proxy", 1);

// Force SSL
app.use(sslRedirect());

// Enable CORS
app.use(function (req, res, next) {
  //res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Origin", req.get("origin"));
  res.header(
    "Access-Control-Allow-Headers",
    "X-CSRFToken, Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "HEAD,OPTIONS,GET,POST,PUT,PATCH,DELETE");

  if (req.method === "OPTIONS") {
    // Return OK response for CORS preflight
    res.json({ message: "Ok" });
  } else {
    next();
  }
});

// JSON Parser
const bodyParserAddRawBody = (req, res, buf, encoding) => {
  req.rawBody = buf.toString();
};
app.use(
  bodyParser.json({
    verify: bodyParserAddRawBody,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: false,
    verify: bodyParserAddRawBody,
  })
);

app.use("/api", api);

app.get("/", (req, res) => {
  res.send("Nexus CDS Editor API");
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`Nexus CDS Editor API listening on port ${port}!`);
});
