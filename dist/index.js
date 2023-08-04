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
const eth_balance_1 = require("./eth-balance");
const erc20_balance_1 = require("./erc20-balance");
dotenv_1.default.config(); // Load environment variables from .env file
const prisma = new client_1.PrismaClient();
// Utility function to fetch transaction info from Etherscan API
async function fetchTransactionInfo(walletAddress) {
    const etherscanBaseUrl = "https://api.etherscan.io/api";
    const apiKey = process.env.ETHERSCAN_API_KEY; // Access API key from environment variable
    const uniTokenAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
    const sushiTokenAddress = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2";
    try {
        // Get the current timestamp (Unix timestamp) in seconds
        const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
        // Get the latest block number from the Etherscan API
        const latestBlockNumberResponse = await axios_1.default.get(`${etherscanBaseUrl}?module=block&action=getblocknobytime&timestamp=${currentTimestampInSeconds}&closest=before&apiKey=${apiKey}`);
        const latestBlockNumber = latestBlockNumberResponse.data.result;
        // console.log("latestBlockNumber: ", latestBlockNumber);
        // Use the latest block number to update the URLs
        const erc20txnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&apiKey=${apiKey}`;
        const uniTokentxnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${uniTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&apiKey=${apiKey}`;
        const erc721txnsUrl = `${etherscanBaseUrl}?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;
        const txnsListUrl = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;
        const sushiTokentxnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${sushiTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&apiKey=${apiKey}`;
        // Fetch transactions data using the updated URLs
        const erc20txns = await axios_1.default.get(erc20txnsUrl);
        const uniTokentxns = await axios_1.default.get(uniTokentxnsUrl);
        const erc721txns = await axios_1.default.get(erc721txnsUrl);
        const txnsList = await axios_1.default.get(txnsListUrl);
        const sushiTokentxns = await axios_1.default.get(sushiTokentxnsUrl);
        return {
            erc20txns: erc20txns.data,
            uniTokentxns: uniTokentxns.data,
            erc721txns: erc721txns.data,
            txnsList: txnsList.data,
            sushiTokentxns: sushiTokentxns.data,
        };
    }
    catch (error) {
        // Explicitly cast 'error' to 'Error' type to resolve TypeScript error
        console.error(`Error fetching transaction info for address ${walletAddress}: ${error.message}`);
        return {};
    }
}
// Get wallet ID from database using wallet address
async function getWalletId(address) {
    const wallet = await prisma.wallet.findUnique({
        where: {
            address: address,
        },
    });
    return wallet ? wallet.id : null;
}
// Main function to fetch wallet addresses from JSON, call API, and save data to database
async function fetchAndSaveData() {
    try {
        // Load wallet addresses from a JSON file
        const walletAddresses = JSON.parse(fs_1.default.readFileSync("./src/wallet-addresses.json", "utf8"));
        // Get the processed addresses from the JSON file
        const processedAddresses = JSON.parse(fs_1.default.readFileSync("./src/processed-addresses.json", "utf8"));
        const processedAddressSet = new Set(processedAddresses);
        // Filter out the addresses that haven't been processed yet
        const remainingAddresses = walletAddresses.filter((address) => !processedAddressSet.has(address));
        for (const walletAddress of remainingAddresses) {
            const walletId = await getWalletId(walletAddress);
            if (!walletId) {
                console.error(`No wallet found for address ${walletAddress}`);
                continue; // Skip this iteration if no wallet was found
            }
            const transactionInfo = await fetchTransactionInfo(walletAddress);
            //   console.log(transactionInfo);
            // Check the status of each transaction type before proceeding
            if (transactionInfo.erc20txns &&
                transactionInfo.erc20txns.status !== "0") {
                // getTokenBalanceHistory(transactionInfo.erc20txns.result, walletAddress);
                await prisma.eRC20Transaction.createMany({
                    data: transactionInfo.erc20txns.result.map((transaction) => ({
                        blockNumber: transaction.blockNumber,
                        timeStamp: new Date(parseInt(transaction.timeStamp) * 1000).toISOString(),
                        hash: transaction.hash,
                        nonce: transaction.nonce,
                        blockHash: transaction.blockHash,
                        from: transaction.from,
                        contractAddress: transaction.contractAddress,
                        to: transaction.to,
                        value: transaction.value,
                        tokenName: transaction.tokenName,
                        tokenSymbol: transaction.tokenSymbol,
                        tokenDecimal: transaction.tokenDecimal,
                        transactionIndex: transaction.transactionIndex,
                        gas: transaction.gas,
                        gasPrice: transaction.gasPrice,
                        gasUsed: transaction.gasUsed,
                        cumulativeGasUsed: transaction.cumulativeGasUsed,
                        input: transaction.input,
                        confirmations: transaction.confirmations,
                        walletId: walletId, // Add walletId to the data
                    })),
                });
            }
            if (transactionInfo.erc721txns &&
                transactionInfo.erc721txns.status !== "0") {
                await prisma.eRC721Transaction.createMany({
                    data: transactionInfo.erc721txns.result.map((transaction) => ({
                        blockNumber: transaction.blockNumber,
                        timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
                        hash: transaction.hash,
                        nonce: transaction.nonce,
                        blockHash: transaction.blockHash,
                        from: transaction.from,
                        contractAddress: transaction.contractAddress,
                        to: transaction.to,
                        tokenID: transaction.tokenID,
                        tokenName: transaction.tokenName,
                        tokenSymbol: transaction.tokenSymbol,
                        tokenDecimal: transaction.tokenDecimal,
                        transactionIndex: transaction.transactionIndex,
                        gas: transaction.gas,
                        gasPrice: transaction.gasPrice,
                        gasUsed: transaction.gasUsed,
                        cumulativeGasUsed: transaction.cumulativeGasUsed,
                        input: transaction.input,
                        confirmations: transaction.confirmations,
                        // walletAddress: walletAddress,
                        walletId: walletId, // Add walletId to the data
                    })),
                });
            }
            if (transactionInfo.txnsList && transactionInfo.txnsList.status !== "0") {
                (0, eth_balance_1.getBalanceHistory)(transactionInfo.txnsList.result, walletAddress);
                await prisma.transaction.createMany({
                    data: transactionInfo.txnsList.result.map((transaction) => ({
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
                        walletId: walletId, // Add walletId to the data
                    })),
                });
            }
            if (transactionInfo.uniTokentxns &&
                transactionInfo.uniTokentxns.status !== "0") {
                (0, erc20_balance_1.getTokenBalanceHistory)(transactionInfo.uniTokentxns.result, walletAddress);
            }
            if (transactionInfo.sushiTokentxns &&
                transactionInfo.sushiTokentxns.status !== "0") {
                (0, erc20_balance_1.getTokenBalanceHistory)(transactionInfo.sushiTokentxns.result, walletAddress);
            }
            processedAddresses.push(walletAddress);
            fs_1.default.writeFileSync("./src/processed-addresses.json", JSON.stringify(processedAddresses, null, 2));
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
fetchAndSaveData();
// fetchTransactionInfo("0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");
// fetchTransactionInfo("0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");
// fetchTransactionInfo("0x07e3a678fac8af6525216b9520b304a78b809743");
