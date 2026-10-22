import { ethers } from "ethers";
import contractAddressJson from "../shared/contractAddress.json";
import contractAbiJson from "../shared/abi/CertificateRegistry.json";

export const getContractAddress = () => contractAddressJson.address;
export const getContractABI = () => contractAbiJson;

/**
 * Connect to the user's MetaMask wallet.
 * @returns {Promise<{accounts: string[], signer: any, provider: any, address: string, chainId: string}>}
 */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install the extension to interact with the blockchain.");
  }
  
  // Initialize Ethers v6 BrowserProvider
  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access from MetaMask
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  
  // Get current network info
  const network = await provider.getNetwork();
  
  return {
    accounts,
    signer,
    provider,
    address: accounts[0],
    chainId: network.chainId.toString()
  };
};

/**
 * Gets the contract instance.
 * @param {any} signerOrProvider - The Ethers signer or provider instance.
 * @returns {ethers.Contract} The contract instance.
 */
export const getContractInstance = (signerOrProvider) => {
  return new ethers.Contract(
    getContractAddress(),
    getContractABI(),
    signerOrProvider
  );
};
