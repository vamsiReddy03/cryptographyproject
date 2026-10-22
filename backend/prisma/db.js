const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_FILE = path.join(__dirname, "db.json");

// Ensure the db file exists with all tables initialized
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      institutes: [],
      departments: [],
      students: [],
      certificates: [],
      certificateVersions: [],
      approvals: [],
      verificationLogs: [],
      blockchainTransactions: [],
      applicationTransactions: [],
      auditLogs: [],
      notifications: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

initDb();

// Helper for recursive object property matching (e.g. student: { departmentId: '...' })
function matchObject(obj, filter) {
  if (filter && typeof filter === "object" && !("in" in filter)) {
    if (!obj || typeof obj !== "object") return false;
    for (const key in filter) {
      if (!matchObject(obj[key], filter[key])) return false;
    }
    return true;
  }
  
  if (filter && typeof filter === "object" && "in" in filter) {
    return filter.in.includes(obj);
  }
  
  return obj === filter;
}

function readData() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading JSON db:", err);
    return {};
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing JSON db:", err);
  }
}

// Relational resolver
function resolveRelations(modelName, item, data) {
  if (!item) return item;
  const resolved = { ...item };

  if (modelName === "users") {
    if (resolved.instituteId) {
      resolved.institute = data.institutes.find(i => i.id === resolved.instituteId) || null;
    }
    if (resolved.departmentId) {
      resolved.department = data.departments.find(d => d.id === resolved.departmentId) || null;
    }
    resolved.student = data.students.find(s => s.userId === resolved.id) || null;
  }
  
  if (modelName === "students") {
    resolved.user = data.users.find(u => u.id === resolved.userId) || null;
    resolved.department = data.departments.find(d => d.id === resolved.departmentId) || null;
    resolved.certificates = data.certificates.filter(c => c.studentId === resolved.id);
  }

  if (modelName === "departments") {
    resolved.institute = data.institutes.find(i => i.id === resolved.instituteId) || null;
  }

  if (modelName === "certificates") {
    resolved.student = data.students.find(s => s.id === resolved.studentId) || null;
    if (resolved.student) {
      resolved.student.user = data.users.find(u => u.id === resolved.student.userId) || null;
      resolved.student.department = data.departments.find(d => d.id === resolved.student.departmentId) || null;
    }
    resolved.versions = data.certificateVersions.filter(v => v.certificateId === resolved.id);
    resolved.approvals = data.approvals.filter(a => a.certificateId === resolved.id);
  }

  if (modelName === "certificateVersions") {
    resolved.certificate = data.certificates.find(c => c.id === resolved.certificateId) || null;
  }

  return resolved;
}

class ModelClient {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async findUnique(query) {
    const data = readData();
    const list = data[this.collectionName] || [];
    const resolvedList = list.map((item) => resolveRelations(this.collectionName, item, data));
    const item = resolvedList.find((x) => {
      for (const key in query.where) {
        if (!matchObject(x[key], query.where[key])) return false;
      }
      return true;
    });

    return item || null;
  }

  async findFirst(query) {
    return this.findUnique(query);
  }

  async findMany(query = {}) {
    const data = readData();
    const list = data[this.collectionName] || [];
    let resolvedList = list.map((item) => resolveRelations(this.collectionName, item, data));

    if (query.where) {
      resolvedList = resolvedList.filter((x) => {
        for (const key in query.where) {
          if (!matchObject(x[key], query.where[key])) return false;
        }
        return true;
      });
    }

    if (query.orderBy) {
      for (const key in query.orderBy) {
        const order = query.orderBy[key] === "desc" ? -1 : 1;
        resolvedList.sort((a, b) => {
          if (a[key] < b[key]) return -1 * order;
          if (a[key] > b[key]) return 1 * order;
          return 0;
        });
      }
    }

    if (query.take) {
      resolvedList = resolvedList.slice(0, query.take);
    }
    
    return resolvedList;
  }

  async create(query) {
    const data = readData();
    const list = data[this.collectionName] || [];
    
    const newItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...query.data,
    };
    
    list.push(newItem);
    data[this.collectionName] = list;
    writeData(data);
    
    return resolveRelations(this.collectionName, newItem, data);
  }

  async update(query) {
    const data = readData();
    const list = data[this.collectionName] || [];
    
    let updatedItem = null;
    const newList = list.map((x) => {
      let matches = true;
      for (const key in query.where) {
        if (x[key] !== query.where[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        updatedItem = {
          ...x,
          ...query.data,
          updatedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return x;
    });

    if (!updatedItem) {
      throw new Error(`Record to update not found in ${this.collectionName}`);
    }

    data[this.collectionName] = newList;
    writeData(data);

    return resolveRelations(this.collectionName, updatedItem, data);
  }

  async delete(query) {
    const data = readData();
    const list = data[this.collectionName] || [];
    
    let deletedItem = null;
    const newList = list.filter((x) => {
      let matches = true;
      for (const key in query.where) {
        if (x[key] !== query.where[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        deletedItem = x;
        return false;
      }
      return true;
    });

    data[this.collectionName] = newList;
    writeData(data);

    return deletedItem;
  }

  async deleteMany(query = {}) {
    const data = readData();
    if (!query.where || Object.keys(query.where).length === 0) {
      const count = (data[this.collectionName] || []).length;
      data[this.collectionName] = [];
      writeData(data);
      return { count };
    }

    const list = data[this.collectionName] || [];
    let count = 0;
    const newList = list.filter((x) => {
      let matches = true;
      for (const key in query.where) {
        if (x[key] !== query.where[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        count++;
        return false;
      }
      return true;
    });

    data[this.collectionName] = newList;
    writeData(data);
    return { count };
  }

  async count(query = {}) {
    const list = await this.findMany(query);
    return list.length;
  }
}

const prisma = {
  user: new ModelClient("users"),
  institute: new ModelClient("institutes"),
  department: new ModelClient("departments"),
  student: new ModelClient("students"),
  certificate: new ModelClient("certificates"),
  certificateVersion: new ModelClient("certificateVersions"),
  approval: new ModelClient("approvals"),
  verificationLog: new ModelClient("verificationLogs"),
  blockchainTransaction: new ModelClient("blockchainTransactions"),
  applicationTransaction: new ModelClient("applicationTransactions"),
  auditLog: new ModelClient("auditLogs"),
  notification: new ModelClient("notifications"),
  $disconnect: async () => {},
};

module.exports = prisma;
