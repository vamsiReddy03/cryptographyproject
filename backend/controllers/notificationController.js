const prisma = require("../prisma/db");

exports.getNotifications = async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, notifications: list });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Server error fetching user notifications" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === "all") {
      await prisma.notification.updateMany({
        where: { userId: req.user.userId },
        data: { isRead: true }
      });
    } else {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
    }
    return res.status(200).json({ success: true, message: "Notifications updated" });
  } catch (error) {
    console.error("Mark read notifications error:", error);
    return res.status(500).json({ error: "Server error updating notifications" });
  }
};
