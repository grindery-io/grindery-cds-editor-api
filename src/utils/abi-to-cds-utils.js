const axios = require("axios");
require("dotenv").config();

// eslint-disable-next-line camelcase
const abiToCDS = (data) => {
  const result = data // "__ToGetYourGEDInTimeASongAboutThe26ABCsIsOfTheEssenceButAPersonalIDCardForUser_456InRoom26AContainingABC26TimesIsNotAsEasyAs123ForC3POOrR2D2Or2R2D"
    .replace(/(_)+/g, " ") // " ToGetYourGEDInTimeASongAboutThe26ABCsIsOfTheEssenceButAPersonalIDCardForUser 456InRoom26AContainingABC26TimesIsNotAsEasyAs123ForC3POOrR2D2Or2R2D"
    .replace(/([a-z])([A-Z][a-z])/g, "$1 $2") // " To Get YourGEDIn TimeASong About The26ABCs IsOf The Essence ButAPersonalIDCard For User456In Room26AContainingABC26Times IsNot AsEasy As123ForC3POOrR2D2Or2R2D"
    .replace(/([A-Z][a-z])([A-Z])/g, "$1 $2") // " To Get YourGEDIn TimeASong About The26ABCs Is Of The Essence ButAPersonalIDCard For User456In Room26AContainingABC26Times Is Not As Easy As123ForC3POOr R2D2Or2R2D"
    .replace(/([a-z])([A-Z]+[a-z])/g, "$1 $2") // " To Get Your GEDIn Time ASong About The26ABCs Is Of The Essence But APersonal IDCard For User456In Room26AContainingABC26Times Is Not As Easy As123ForC3POOr R2D2Or2R2D"
    .replace(/([A-Z]+)([A-Z][a-z][a-z])/g, "$1 $2") // " To Get Your GEDIn Time A Song About The26ABCs Is Of The Essence But A Personal ID Card For User456In Room26A ContainingABC26Times Is Not As Easy As123ForC3POOr R2D2Or2R2D"
    .replace(/([a-z]+)([A-Z0-9]+)/g, "$1 $2") // " To Get Your GEDIn Time A Song About The 26ABCs Is Of The Essence But A Personal ID Card For User 456In Room 26A Containing ABC26Times Is Not As Easy As 123For C3POOr R2D2Or 2R2D"

    // Note: the next regex includes a special case to exclude plurals of acronyms, e.g. "ABCs"
    .replace(/([A-Z]+)([A-Z][a-rt-z][a-z]*)/g, "$1 $2") // " To Get Your GED In Time A Song About The 26ABCs Is Of The Essence But A Personal ID Card For User 456In Room 26A Containing ABC26Times Is Not As Easy As 123For C3PO Or R2D2Or 2R2D"
    .replace(/([0-9])([A-Z][a-z]+)/g, "$1 $2") // " To Get Your GED In Time A Song About The 26ABCs Is Of The Essence But A Personal ID Card For User 456In Room 26A Containing ABC 26Times Is Not As Easy As 123For C3PO Or R2D2Or 2R2D"

    // Note: the next two regexes use {2,} instead of + to add space on phrases like Room26A and 26ABCs but not on phrases like R2D2 and C3PO"
    .replace(/([A-Z]{2,})([0-9]{2,})/g, "$1 $2") // " To Get Your GED In Time A Song About The 26ABCs Is Of The Essence But A Personal ID Card For User 456 In Room 26A Containing ABC 26 Times Is Not As Easy As 123 For C3PO Or R2D2 Or 2R2D"
    .replace(/([0-9]{2,})([A-Z]{2,})/g, "$1 $2") // " To Get Your GED In Time A Song About The 26 ABCs Is Of The Essence But A Personal ID Card For User 456 In Room 26A Containing ABC 26 Times Is Not As Easy As 123 For C3PO Or R2D2 Or 2R2D"
    .trim(); // "To Get Your GED In Time A Song About The 26 ABCs Is Of The Essence But A Personal ID Card For User 456 In Room 26A Containing ABC 26 Times Is Not As Easy As 123 For C3PO Or R2D2 Or 2R2D"
  // capitalize the first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
};

function mapType(abiType) {
  abiType = abiType.replace("[]", "");
  const NUMBER_TYPES = ["uint8", "uint16", "uint32", "int8", "int16", "int32", "bytes1"];
  if (NUMBER_TYPES.includes(abiType)) {
    return "number";
  }
  if (abiType === "bool") {
    return "boolean";
  }
  if (abiType === "address") {
    return "address";
  }
  return "string";
}

function abiInputToField(inp) {
  return {
    key: inp.name,
    label: abiToCDS(inp.name),
    type: mapType(inp.type),
    placeholder: inp.type === "address" ? "Enter a blockchain address" : "",
    list: inp.type.includes("[]"),
  };
}

function getFunctionSuffix(abiItem) {
  const items = [];
  if (abiItem.payable) {
    items.push("payable");
  }
  if (abiItem.constant) {
    items.push("view");
  }
  if (abiItem.stateMutability === "pure") {
    items.push("pure");
  }
  if (abiItem.outputs?.length) {
    items.push(
      `returns (${
        abiItem.outputs.length === 1 ? abiItem.outputs[0].type : abiItem.outputs.map((x) => x.type).join(", ")
      })`
    );
  }
  if (!items.length) {
    return "";
  }
  return " " + items.join(" ");
}

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isValidHttpUrl = (string) => {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
};

const convertImgToBase64 = (url, callback, outputFormat) => {
  var canvas = document.createElement("CANVAS");
  var ctx = canvas.getContext("2d");
  var img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = function () {
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL(outputFormat || "image/png");
    callback.call(this, dataURL);
    // Clean up
    canvas = null;
  };
  img.src = url;
};

const convertImgToBase64Wrapper = (url) => {
  return new Promise((resolve, reject) => {
    convertImgToBase64(url, (successResponse) => {
      resolve(successResponse);
    });
  });
};

async function improveCdsWithOpenAI(prompt, { name, description, schema }) {
  // try {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo-0613",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      functions: [{ name: name, description: description, parameters: schema }],
      function_call: "auto",
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  return (
    (response.data.choices?.[0]?.message?.function_call?.arguments &&
      JSON.parse(response.data.choices[0].message.function_call.arguments)) ??
    undefined
  );

  // return 10;
  // } catch (error) {
  //   console.error("Error:", error.response.data.error);

  //   return error.response;

  //   // return res
  //   //   .status(400)
  //   //   .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  // }
}

const CDS_EDITOR_API_ENDPOINT = "https://cds-editor.grindery.org/api/v1";

const schema_triggers_openai = {
  type: "object",
  properties: {
    result: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "description for the trigger" },
          helperTextInputs: {
            type: "array",
            items: {
              type: "string",
              description: "helper text for the user",
            },
          },
        },
      },
    },
  },
};

const schema_actions_openai = {
  type: "object",
  properties: {
    result: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "description for the action/function" },
          helperTextInputs: {
            type: "array",
            items: {
              type: "string",
              description: "helper text for the user",
            },
          },
        },
      },
    },
  },
};

const schema_description_openai = {
  type: "object",
  properties: {
    description: {
      type: "string",
      description: "global description of the connector",
    },
  },
};

async function modifyTriggersOrActions(toModify, resultOpenAI) {
  toModify.forEach((element, index) => {
    const result = resultOpenAI[index] || {};
    element.display.description = result.description || element.display.description;
    if (result.helperTextInputs) {
      element.operation.inputFields.forEach((inputField, k) => {
        inputField.helpText = result.helperTextInputs[k] || inputField.helpText;
      });
    }
  });
}

module.exports = {
  abiToCDS,
  abiInputToField,
  convertImgToBase64Wrapper,
  convertImgToBase64,
  isValidHttpUrl,
  slugify,
  getFunctionSuffix,
  abiInputToField,
  mapType,
  improveCdsWithOpenAI,
  modifyTriggersOrActions,
  CDS_EDITOR_API_ENDPOINT,
  schema_triggers_openai,
  schema_actions_openai,
  schema_description_openai,
};
