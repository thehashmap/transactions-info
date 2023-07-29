"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables from .env file
const prisma = new client_1.PrismaClient();
// Utility function to fetch transaction info from Etherscan API
async function fetchTransactionInfo(walletAddress) {
    const etherscanBaseUrl = "https://api.etherscan.io/api";
    const apiKey = process.env.ETHERSCAN_API_KEY; // Access API key from environment variable
    const url = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&apiKey=${apiKey}`;
    try {
        const response = await axios_1.default.get(url);
        return response.data.result;
    }
    catch (error) {
        // Explicitly cast 'error' to 'Error' type to resolve TypeScript error
        console.error(`Error fetching transaction info for address ${walletAddress}: ${error.message}`);
        return [];
    }
}
// Main function to fetch wallet addresses from JSON, call API, and save data to database
async function fetchAndSaveData() {
    try {
        // Load wallet addresses from a JSON file (you can add more addresses here)
        const walletAddresses = JSON.parse(fs_1.default.readFileSync("./src/wallet-addresses.json", "utf8"));
        // Get the processed addresses from the JSON file
        const processedAddresses = JSON.parse(fs_1.default.readFileSync("./src/processed-addresses.json", "utf8"));
        const processedAddressSet = new Set(processedAddresses);
        // Filter out the addresses that haven't been processed yet
        const remainingAddresses = walletAddresses.filter((address) => !processedAddressSet.has(address));
        for (const walletAddress of remainingAddresses) {
            const transactionInfo = await fetchTransactionInfo(walletAddress);
            if (transactionInfo.length > 0) {
                await prisma.wallet.create({
                    data: {
                        address: walletAddress,
                        transactions: {
                            createMany: {
                                data: transactionInfo.map((transaction) => ({
                                    hash: transaction.hash,
                                    blockNumber: parseInt(transaction.blockNumber),
                                    from: transaction.from,
                                    to: transaction.to,
                                    value: transaction.value,
                                    timestamp: new Date(parseInt(transaction.timeStamp) * 1000),
                                })),
                            },
                        },
                    },
                });
                // Add the processed address to the JSON file to avoid duplicates
                processedAddresses.push(walletAddress);
                fs_1.default.writeFileSync("./src/processed-addresses.json", JSON.stringify(processedAddresses, null, 2));
            }
        }
        console.log("Data fetching and saving complete.");
    }
    catch (error) {
        console.error("Error in fetchAndSaveData:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Call the main function to start the process
fetchAndSaveData();
