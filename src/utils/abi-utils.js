const axios = require("axios");

const chains = {
  "eip155:1": {
    api_endpoint: "https://api.etherscan.io/api?module=contract",
    api_token: process.env.ETHERSCAN_API_TOKEN,
  },
  "eip155:137": {
    api_endpoint: "https://api.polygonscan.com/api?module=contract",
    api_token: process.env.POLYGONSCAN_API_TOKEN,
  },
  "eip155:100": {
    api_endpoint: "https://blockscout.com/xdai/mainnet/api?module=contract",
    api_token: process.env.BLOCKSCOUT_API_TOKEN,
  },
  "eip155:1666600000": {
    api_endpoint: "https://ctrver.t.hmny.io/fetchContractCode",
  },
};

function AbiUtils() {}

const self = AbiUtils.prototype;

AbiUtils.prototype.getSimpleEvmAbi = (blockchain, address) => {
  return new Promise((resolve, reject) => {
    if (!blockchain) {
      reject({ message: "Blockchain is required" });
    }
    if (!address) {
      reject({ message: "Contract address is required" });
    }
    let abi;
    const endpoint = (chains[blockchain] && chains[blockchain].api_endpoint) || null;
    const token = (chains[blockchain] && chains[blockchain].api_token) || null;
    if (!endpoint) {
      reject({ message: "Blockchain API is missing" });
    }
    if (!token) {
      reject({ message: "Blockchain API token is missing" });
    }
    axios
      .get(`${endpoint}&action=getabi&address=${address}&apikey=${token}`)
      .then((res) => {
        abi = (res && res.data && res.data.result) || null;
        resolve(abi);
      })
      .catch((err) => {
        console.error("getSimpleEvmAbi error => ", err.message);
        reject(err);
      });
  });
};

AbiUtils.prototype.getHarmonyAbi = (blockchain, address) => {
  return new Promise((resolve, reject) => {
    if (!address) {
      reject({ message: "Contract address is required" });
    }
    let abi;
    const endpoint = (chains[blockchain] && chains[blockchain].api_endpoint) || null;
    if (!endpoint) {
      reject({ message: "Blockchain API is missing" });
    }
    axios
      .get(`${endpoint}?contractAddress=${address}`)
      .then((res) => {
        abi = (res && res.data && res.data.abi && JSON.stringify(res.data.abi)) || null;
        resolve(abi);
      })
      .catch((err) => {
        console.error("getHarmonyAbi error => ", err.message);
        reject(err);
      });
  });
};

module.exports = new AbiUtils();
