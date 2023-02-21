const express = require("express"),
  abiUtils = require("../utils/abi-utils");

const abi = express.Router();

/**
 * GET /api/v1/abi
 *
 * @summary Get smart-contract ABI
 * @description Get smart-contract ABI by blockchain and smart-contract address.
 * @tags ABI
 * @param {string} blockchain.query.required - An Id of the chain, following CAIP-2 schema e.g. eip155:1.
 * @param {string} address.query.required - Smart-contract address
 * @return {object} 200 - Success response
 * @return {object} 400 - Error response
 * @example response - 200 - Success response example
 * {
 *   "result": "[{\"constant\":false,\"inputs\":[{\"name\":\"newImplementation\",\"type\":\"address\"}],\"name\":\"upgradeTo\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"newImplementation\",\"type\":\"address\"},{\"name\":\"data\",\"type\":\"bytes\"}],\"name\":\"upgradeToAndCall\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"implementation\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"newAdmin\",\"type\":\"address\"}],\"name\":\"changeAdmin\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"admin\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"name\":\"_implementation\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"fallback\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"previousAdmin\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"newAdmin\",\"type\":\"address\"}],\"name\":\"AdminChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"implementation\",\"type\":\"address\"}],\"name\":\"Upgraded\",\"type\":\"event\"}]"
 * }
 * @example response - 400 - Error response example
 * {
 *   "message": "Error message"
 * }
 */
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
