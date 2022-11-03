function Constants() {}

Constants.prototype.SUBSCRIPTION_TYPES = {
  CONTACT_CREATION: "contact.creation",
  CONTACT_PRIVACY_DELETION: "contact.privacyDeletion",
  CONTACT_DELETION: "contact.deletion",
  CONTACT_PROPERTY_CHANGE: "contact.propertyChange",
};

module.exports = new Constants();
