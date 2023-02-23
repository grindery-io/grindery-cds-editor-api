const express = require("express"),
  bodyParser = require("body-parser"),
  sslRedirect = require("heroku-ssl-redirect"),
  api = require("./api/index"),
  api_v1 = require("./api_v1/index");
const expressJSDocSwagger = require("express-jsdoc-swagger");

const options = {
  info: {
    version: "1.0.0",
    title: "Grindery CDS Editor API",
    description: "API for Grindery CDS editor app: https://network.grindery.org",
    license: {
      name: "MIT",
    },
  },
  security: {
    BearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  servers: [
    {
      url: "https://nexus-cds-editor-api.herokuapp.com",
      description: "Production server",
    },
  ],
  // Base directory which we use to locate your JSDOC files
  baseDir: __dirname,
  // Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
  filesPattern: "./**/*.js",
  // URL where SwaggerUI will be rendered
  swaggerUIPath: "/docs",
  // Expose OpenAPI UI
  exposeSwaggerUI: true,
  // Expose Open API JSON Docs documentation in `apiDocsPath` path.
  exposeApiDocs: false,
  // Open API JSON Docs endpoint.
  apiDocsPath: "/v3/api-docs",
  // Set non-required fields as nullable by default
  notRequiredAsNullable: false,
  // You can customize your UI options.
  // you can extend swagger-ui-express config. You can checkout an example of this
  // in the `example/configuration/swaggerOptions.js`
  swaggerUiOptions: {},
  // multiple option in case you want more that one instance
  multiple: false,
};

const app = express();

expressJSDocSwagger(app)(options);

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

app.use("/api/v1", api_v1);

app.get("/", (req, res) => {
  res.redirect("/docs");
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`Nexus CDS Editor API listening on port ${port}!`);
});
