"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables from .env file
const prisma = new client_1.PrismaClient();
// Utility function to fetch transaction info from Etherscan API
async function fetchTransactionInfo(walletAddress) {
    const etherscanBaseUrl = "https://api-goerli.etherscan.io/api";
    const apiKey = process.env.ETHERSCAN_API_KEY; // Access API key from environment variable
    const uniTokenAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
    const sushiTokenAddress = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2";
    try {
        // Get the current timestamp (Unix timestamp) in seconds
        const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
        // Get the latest block number from the Etherscan API
        const latestBlockNumberResponse = await axios_1.default.get(`${etherscanBaseUrl}?module=block&action=getblocknobytime&timestamp=${currentTimestampInSeconds}&closest=before&apiKey=${apiKey}`);
        const latestBlockNumber = latestBlockNumberResponse.data.result;
        console.log("latestBlockNumber: ", latestBlockNumber);
        // Use the latest block number to update the erc20txns URL
        // const erc20txns = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${uniTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&apiKey=${apiKey}`;
        // const erc20txns = `${etherscanBaseUrl}?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;
        const txnsList = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;
        // Fetch ERC20 transactions using the updated URL
        const response = await axios_1.default.get(txnsList);
        console.log(response.data);
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
        const walletAddresses = ["0x34d014758297c00FeA49935FCe172677904d51EF"]; // Update with your desired wallet addresses
        for (const walletAddress of walletAddresses) {
            const transactionInfo = await fetchTransactionInfo(walletAddress);
            if (transactionInfo.length > 0) {
                await prisma.wallet.create({
                    data: {
                        address: walletAddress,
                        transactions: {
                            createMany: {
                                data: transactionInfo.map((transaction) => ({
                                    hash: transaction.hash,
                                    blockNumber: transaction.blockNumber,
                                    timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
                                    from: transaction.from,
                                    to: transaction.to,
                                    value: transaction.value,
                                    nonce: transaction.nonce,
                                    blockHash: transaction.blockHash,
                                    transactionIndex: transaction.transactionIndex,
                                    gas: transaction.gas,
                                    gasPrice: transaction.gasPrice,
                                    isError: transaction.isError,
                                    txreceipt_status: transaction.txreceipt_status,
                                    input: transaction.input,
                                    contractAddress: transaction.contractAddress,
                                    cumulativeGasUsed: transaction.cumulativeGasUsed,
                                    gasUsed: transaction.gasUsed,
                                    confirmations: transaction.confirmations,
                                    methodId: transaction.methodId,
                                    functionName: transaction.functionName,
                                })),
                            },
                        },
                    },
                });
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
