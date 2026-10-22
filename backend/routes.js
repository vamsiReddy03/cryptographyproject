const express = require("express");
const multer = require("multer");
const { authenticateToken, requireRoles } = require("./middleware/authMiddleware");

// Controllers
const authController = require("./controllers/authController");
const adminController = require("./controllers/adminController");
const certificateController = require("./controllers/certificateController");
const reportController = require("./controllers/reportController");
const transactionController = require("./controllers/transactionController");
const notificationController = require("./controllers/notificationController");
const aiController = require("./controllers/aiController");

const router = express.Router();

// Multer storage configuration for parsing uploaded files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // limit size 10MB
});

// Authentication Routes
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refreshToken);
router.post("/auth/logout", authenticateToken, authController.logout);
router.get("/auth/profile", authenticateToken, authController.getProfile);

// Admin Routes (RBAC)
router.post("/admin/institutes", authenticateToken, requireRoles(["SUPER_ADMIN"]), adminController.createInstitute);
router.get("/admin/institutes", adminController.getInstitutes);
router.post("/admin/departments", authenticateToken, requireRoles(["INSTITUTE_ADMIN"]), adminController.createDepartment);
router.get("/admin/departments", authenticateToken, adminController.getDepartments);
router.post("/admin/users", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), adminController.createUser);
router.get("/admin/users", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), adminController.getUsers);

// Certificate Workflows
router.get("/certificates", authenticateToken, certificateController.getCertificates);
router.post("/certificates/draft", authenticateToken, requireRoles(["FACULTY"]), certificateController.createDraft);
router.post("/certificates/submit/:id", authenticateToken, requireRoles(["FACULTY"]), certificateController.submitCertificate);
router.post("/certificates/approve/hod/:id", authenticateToken, requireRoles(["HOD"]), certificateController.approveHOD);
router.post("/certificates/approve/principal/:id", authenticateToken, requireRoles(["INSTITUTE_ADMIN"]), certificateController.approvePrincipal);
router.post("/certificates/issue/:id", authenticateToken, requireRoles(["FACULTY"]), certificateController.issueCertificate);
router.post("/certificates/reissue/:id", authenticateToken, requireRoles(["FACULTY"]), certificateController.reissueCertificate);
router.post("/certificates/revoke/:id", authenticateToken, requireRoles(["FACULTY", "INSTITUTE_ADMIN"]), certificateController.revokeCertificate);
router.get("/certificates/verify", certificateController.verifyDetails);
router.get("/certificates/timeline/:certificateId", certificateController.getTimeline);

// AI & OCR endpoints
router.post("/certificates/ocr", authenticateToken, requireRoles(["FACULTY"]), upload.single("file"), certificateController.ocrExtract);
router.post("/certificates/fraud-check", upload.single("file"), certificateController.fraudCheck);

// Report Exports
router.get("/reports/verification-logs", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), reportController.exportVerificationLogs);
router.get("/reports/issued", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), reportController.exportIssuedCertificates);

// Ledger & Transaction Logs
router.get("/transactions/blockchain", authenticateToken, transactionController.getBlockchainTxs);
router.get("/transactions/application", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), transactionController.getApplicationTxs);
router.get("/transactions/audit", authenticateToken, requireRoles(["SUPER_ADMIN", "INSTITUTE_ADMIN"]), transactionController.getAuditLogs);
router.get("/transactions/analytics", transactionController.getAnalytics);

// Notifications Routes
router.get("/notifications", authenticateToken, notificationController.getNotifications);
router.post("/notifications/read/:id", authenticateToken, notificationController.markAsRead);

// AI Bot Chat Helper
router.post("/ai/chat", aiController.chatHelp);

module.exports = router;
