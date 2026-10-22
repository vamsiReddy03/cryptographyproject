const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const currentDir = __dirname;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const registry = await hre.ethers.deployContract("CertificateRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("CertificateRegistry deployed to:", address);

  // Core folders
  const paths = [
    path.join(currentDir, "../shared"),
    path.join(currentDir, "../shared/abi"),
    path.join(currentDir, "../shared/constants"),
    path.join(currentDir, "../frontend/src/shared"),
    path.join(currentDir, "../frontend/src/shared/abi"),
    path.join(currentDir, "../frontend/src/shared/constants")
  ];

  // Create all directories if they don't exist
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }

  // Write address to both destinations
  const addrContent = JSON.stringify({ address: address }, null, 2);
  fs.writeFileSync(path.join(currentDir, "../shared/contractAddress.json"), addrContent);
  fs.writeFileSync(path.join(currentDir, "../frontend/src/shared/contractAddress.json"), addrContent);
  console.log("Contract address written to shared/contractAddress.json and frontend/src/shared/");

  // Write ABI from Hardhat build artifacts to both destinations
  const artifactPath = path.join(
    currentDir,
    "../artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json"
  );
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiContent = JSON.stringify(artifact.abi, null, 2);
    
    fs.writeFileSync(path.join(currentDir, "../shared/abi/CertificateRegistry.json"), abiContent);
    fs.writeFileSync(path.join(currentDir, "../frontend/src/shared/abi/CertificateRegistry.json"), abiContent);
    console.log("ABI written to shared/abi/CertificateRegistry.json and frontend/src/shared/");
  } else {
    console.log("Warning: Artifact not found at", artifactPath);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
