const prisma = require("./db");
const crypto = require("crypto");

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.applicationTransaction.deleteMany();
  await prisma.blockchainTransaction.deleteMany();
  await prisma.verificationLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.certificateVersion.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.institute.deleteMany();

  const defaultPasswordHash = crypto.createHash("sha256").update("Password123").digest("hex");

  // 1. Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@certichain.com",
      passwordHash: defaultPasswordHash,
      name: "System Super Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  console.log("Created Super Admin:", superAdmin.email);

  // 2. Create Institute
  const institute = await prisma.institute.create({
    data: {
      name: "CertiChain Institute of Technology",
      code: "CIT",
      status: "ACTIVE",
    },
  });
  console.log("Created Institute:", institute.name);

  // 3. Create Departments
  const csDept = await prisma.department.create({
    data: {
      name: "Computer Science and Engineering",
      code: "CSE",
      instituteId: institute.id,
    },
  });
  const ecDept = await prisma.department.create({
    data: {
      name: "Electronics and Communication",
      code: "ECE",
      instituteId: institute.id,
    },
  });
  console.log("Created Departments: CSE, ECE");

  // 4. Create Institute Admin
  const instAdmin = await prisma.user.create({
    data: {
      email: "admin@cit.edu",
      passwordHash: defaultPasswordHash,
      name: "CIT Admin Staff",
      role: "INSTITUTE_ADMIN",
      instituteId: institute.id,
      status: "ACTIVE",
    },
  });
  console.log("Created Institute Admin:", instAdmin.email);

  // 5. Create HOD
  const hodUser = await prisma.user.create({
    data: {
      email: "hod.cse@cit.edu",
      passwordHash: defaultPasswordHash,
      name: "Dr. Charles Xavier",
      role: "HOD",
      instituteId: institute.id,
      departmentId: csDept.id,
      status: "ACTIVE",
    },
  });
  console.log("Created HOD:", hodUser.email);

  // 6. Create Faculty (Issuer)
  const facultyUser = await prisma.user.create({
    data: {
      email: "faculty.cse@cit.edu",
      passwordHash: defaultPasswordHash,
      name: "Prof. Erik Lensherr",
      role: "FACULTY",
      instituteId: institute.id,
      departmentId: csDept.id,
      status: "ACTIVE",
    },
  });
  console.log("Created Faculty:", facultyUser.email);

  // 7. Create Student
  const studentUser = await prisma.user.create({
    data: {
      email: "student@cit.edu",
      passwordHash: defaultPasswordHash,
      name: "Logan Howlett",
      role: "STUDENT",
      instituteId: institute.id,
      departmentId: csDept.id,
      status: "ACTIVE",
    },
  });

  const student = await prisma.student.create({
    data: {
      rollNumber: "CIT-CSE-2026-001",
      userId: studentUser.id,
      departmentId: csDept.id,
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat Account #1
    },
  });
  console.log("Created Student:", studentUser.email, "Roll Number:", student.rollNumber);

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
