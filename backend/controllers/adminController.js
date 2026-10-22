const crypto = require("crypto");
const prisma = require("../prisma/db");

// Manage Institutes (Super Admin only)
exports.createInstitute = async (req, res) => {
  try {
    const { name, code, logoUrl } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Institute name and code are required" });
    }

    const existing = await prisma.institute.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: "Institute code already exists" });
    }

    const inst = await prisma.institute.create({
      data: { name, code, logoUrl, status: "ACTIVE" },
    });

    const adminEmail = `admin.${code.toLowerCase()}@certichain.com`;
    const generatedPassword = `Admin@${code.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = crypto.createHash("sha256").update(generatedPassword).digest("hex");

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: `${name} Administrator`,
        role: "INSTITUTE_ADMIN",
        instituteId: inst.id,
        status: "ACTIVE"
      }
    });

    return res.status(201).json({ 
      success: true, 
      institute: inst,
      adminCredentials: {
        email: adminEmail,
        password: generatedPassword
      }
    });
  } catch (error) {
    console.error("Create institute error:", error);
    return res.status(500).json({ error: "Server error creating institute" });
  }
};

exports.getInstitutes = async (req, res) => {
  try {
    const insts = await prisma.institute.findMany();
    return res.status(200).json({ success: true, institutes: insts });
  } catch (error) {
    console.error("Get institutes error:", error);
    return res.status(500).json({ error: "Server error fetching institutes" });
  }
};

// Manage Departments (Institute Admin)
exports.createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    const { instituteId } = req.user;

    if (!name || !code || !instituteId) {
      return res.status(400).json({ error: "Name, code, and institute are required" });
    }

    const dept = await prisma.department.create({
      data: { name, code, instituteId },
    });

    return res.status(201).json({ success: true, department: dept });
  } catch (error) {
    console.error("Create department error:", error);
    return res.status(500).json({ error: "Server error creating department" });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const instituteId = req.user.instituteId || req.query.instituteId;
    if (!instituteId) {
      return res.status(400).json({ error: "Institute ID is required" });
    }

    const depts = await prisma.department.findMany({
      where: { instituteId },
    });

    return res.status(200).json({ success: true, departments: depts });
  } catch (error) {
    console.error("Get departments error:", error);
    return res.status(500).json({ error: "Server error fetching departments" });
  }
};

// Manage Users (Institute Admin or Super Admin)
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role, departmentId, rollNumber, walletAddress } = req.body;
    let instituteId = req.user.instituteId;

    // Super Admin can specify instituteId
    if (req.user.role === "SUPER_ADMIN") {
      instituteId = req.body.instituteId;
    }

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "Email, password, name, and role are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        instituteId: role === "SUPER_ADMIN" ? null : instituteId,
        departmentId: role === "SUPER_ADMIN" ? null : departmentId,
        status: "ACTIVE",
      },
    });

    // If role is Student, create Student record
    if (role === "STUDENT") {
      if (!rollNumber || !departmentId) {
        return res.status(400).json({ error: "Roll number and Department ID are required for students" });
      }

      await prisma.student.create({
        data: {
          rollNumber,
          userId: user.id,
          departmentId,
          walletAddress: walletAddress || null,
        },
      });
    }

    // Log Action
    await prisma.auditLog.create({
      data: {
        action: "CREATE_USER",
        details: `Created user ${email} with role ${role}`,
        userId: req.user.userId,
      },
    });

    return res.status(201).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({ error: "Server error creating user" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    let whereClause = {};

    // Institute admins only see their own institute's users
    if (req.user.role === "INSTITUTE_ADMIN") {
      whereClause.instituteId = req.user.instituteId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        student: true,
      },
    });

    // Sanitize password hashes
    const sanitized = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      department: u.department,
      student: u.student,
      createdAt: u.createdAt,
    }));

    return res.status(200).json({ success: true, users: sanitized });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Server error fetching users" });
  }
};
