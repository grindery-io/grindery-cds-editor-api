const express = require("express"),
  abiUtils = require("../utils/abi-utils");

const abi = express.Router();

abi.get("/", async (req, res) => {
  const { blockchain, address } = req.query;
  if (!blockchain) {
    return res.status(400).json({ message: "Blockchain is required" });
  }
  if (!address) {
    return res.status(400).json({ message: "Contract address is required" });
  }

  let getAbiFunction;

  switch (blockchain) {
    case "eip155:1":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:137":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:100":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:42161":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:43114":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:56":
      getAbiFunction = abiUtils.getSimpleEvmAbi;
      break;
    case "eip155:1666600000":
      getAbiFunction = abiUtils.getHarmonyAbi;
      break;
    default:
      return res.status(404).json({ message: "Chain is not supported" });
  }

  let abi;
  try {
    abi = await getAbiFunction(blockchain, address);
  } catch (err) {
    return res
      .status(400)
      .json({ message: (err && err.response && err.response.data && err.response.data.message) || err.message });
  }
  return res.json({ result: abi });
});

module.exports = abi;
