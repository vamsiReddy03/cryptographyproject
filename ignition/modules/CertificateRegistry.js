const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CertificateRegistryModule", (m) => {
  const registry = m.contract("CertificateRegistry");

  return { registry };
});
