const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/db");

const JWT_SECRET = process.env.JWT_SECRET || "certichain-jwt-super-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "certichain-jwt-refresh-secret-key";

// Helper to generate access & refresh tokens
function generateTokens(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    instituteId: user.instituteId,
    departmentId: user.departmentId,
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  
  return { accessToken, refreshToken };
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        institute: true,
        department: true,
        student: true
      }
    });
    
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid email or user is inactive" });
    }
    
    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (inputHash !== user.passwordHash) {
      return res.status(401).json({ error: "Invalid password" });
    }
    
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Log Application Transaction
    await prisma.applicationTransaction.create({
      data: {
        action: "LOGIN",
        userId: user.id,
        status: "SUCCESS",
        details: `User logged in: ${user.email} (${user.role})`,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_LOGIN",
        details: `Successful login for email: ${user.email}`,
        userId: user.id,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
      }
    });
    
    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        instituteId: user.instituteId,
        departmentId: user.departmentId,
        studentId: user.student?.id || null,
        rollNumber: user.student?.rollNumber || null
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server login error" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { student: true }
    });
    
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "User not found or inactive" });
    }
    
    const tokens = generateTokens(user);
    return res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ error: "Server refresh token error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        institute: true,
        department: true,
        student: {
          include: {
            department: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        institute: user.institute,
        department: user.department,
        student: user.student
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Server error fetching profile" });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.applicationTransaction.create({
        data: {
          action: "LOGOUT",
          userId: req.user.userId,
          status: "SUCCESS",
          details: `User logged out`,
          ipAddress: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1"
        }
      });
    }
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Server logout error" });
  }
};
