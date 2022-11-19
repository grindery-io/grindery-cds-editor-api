//import { Collection, CreateIndexesOptions, Db, IndexSpecification, MongoClient } from "mongodb";
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

function MongoUtils() {}

const self = MongoUtils.prototype;

/*
notifications: {
    key: string;
    title: string;
    body: string;
    url?: string;
    icon?: string; // icon url
    to: string; // one of "all" or {userID}
    readBy: string[]; // array of {userID}
    sentAt: number; // milliseconds since epoch
};
*/

MongoUtils.prototype.cachedClient = null;

MongoUtils.prototype.INDEXES = {
  notifications: [[{ key: 1 }, { unique: true }], [{ to: 1 }, {}], [{ to: 1, readBy: 1 }]],
};

MongoUtils.prototype.createIndexes = async (db) => {
  for (const collectionName of Object.keys(self.INDEXES)) {
    const collection = db.collection(collectionName);
    for (const [spec, options] of self.INDEXES[collectionName]) {
      await collection.createIndex(spec, options);
    }
  }
};

MongoUtils.prototype.getDb = async () => {
  if (self.cachedClient) {
    return (await self.cachedClient).db();
  }
  const uri = MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }
  self.cachedClient = MongoClient.connect(uri);
  self.cachedClient = await self.cachedClient;
  await self.createIndexes(self.cachedClient.db());
  return self.cachedClient.db();
};

MongoUtils.prototype.getCollection = async (collectionName) => {
  const db = await self.getDb().catch((e) => {
    console.error("Failed to connect to database:", e);
    process.exit(1);
  });
  return db.collection(collectionName);
};

module.exports = new MongoUtils();
