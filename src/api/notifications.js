const express = require("express"),
  routines = require("../utils/routines"),
  auth = require("../utils/auth-utils");
const { v4: uuidv4 } = require("uuid");

const notifications = express.Router();

const NOTIFICATIONS_ADMIN_WORKSPACE = process.env.NOTIFICATIONS_ADMIN_WORKSPACE;

notifications.get("/", auth.isRequired, async (req, res) => {
  let items;
  try {
    items = await routines.getNotificationsByUser(res.locals.userId);
  } catch (err) {
    return routines.sendError(res, err);
  }

  // replace `readBy` array with `read` boolean
  const result = [
    ...items.map((item) => ({ ...item, readBy: undefined, read: item.readBy.includes(res.locals.userId) })),
  ];
  return res.json({
    result,
  });
});

notifications.post("/", auth.isRequired, async (req, res) => {
  const { notification } = req.body;
  if (!res.locals.workspaceId || res.locals.workspaceId !== NOTIFICATIONS_ADMIN_WORKSPACE) {
    return routines.sendError(res, { message: "Not allowed" }, 403);
  }
  if (!notification.title) {
    return routines.sendError(res, { message: "Notification title is required" });
  }
  if (!notification.body) {
    return routines.sendError(res, { message: "Notification body is required" });
  }
  notification.key = uuidv4();
  notification.to = notification.to || "all";
  notification.sentAt = Date.now();
  notification.readBy = [];

  try {
    await routines.saveNotification(notification);
  } catch (err) {
    return routines.sendError(res, err);
  }
  return res.json({ success: true, id: notification.key });
});

notifications.post("/mark-read", auth.isRequired, async (req, res) => {
  const { notifications } = req.body;
  if (!notifications || !Array.isArray(notifications)) {
    return routines.sendError(res, { message: "Notification ids array is required" });
  }
  try {
    await routines.markNotificationsAsRead(notifications, res.locals.userId);
  } catch (err) {
    return routines.sendError(res, err);
  }
  return res.json({ success: true });
});

notifications.get("/count", auth.isRequired, async (req, res) => {
  let count;
  try {
    count = await routines.getNewNotificationsCountByUser(res.locals.userId);
  } catch (err) {
    return routines.sendError(res, err);
  }
  return res.json({ result: count });
});

module.exports = notifications;
