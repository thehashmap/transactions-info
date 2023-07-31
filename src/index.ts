// src/index.ts
import fs from "fs";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const prisma = new PrismaClient();

// Utility function to fetch transaction info from Etherscan API
async function fetchTransactionInfo(walletAddress: string): Promise<any> {
  const etherscanBaseUrl = "https://api.etherscan.io/api";
  const apiKey = process.env.ETHERSCAN_API_KEY; // Access API key from environment variable

  const uniTokenAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  const sushiTokenAddress = "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2";

  try {
    // Get the current timestamp (Unix timestamp) in seconds
    const currentTimestampInSeconds = Math.floor(Date.now() / 1000);

    // Get the latest block number from the Etherscan API
    const latestBlockNumberResponse = await axios.get(
      `${etherscanBaseUrl}?module=block&action=getblocknobytime&timestamp=${currentTimestampInSeconds}&closest=before&apiKey=${apiKey}`
    );
    const latestBlockNumber = latestBlockNumberResponse.data.result;
    console.log("latestBlockNumber: ", latestBlockNumber);

    // Use the latest block number to update the erc20txns URL
    const erc20txns = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${uniTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&apiKey=${apiKey}`;
    // const erc20txns = `${etherscanBaseUrl}?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;
    const txnsList = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=1000&sort=asc&apiKey=${apiKey}`;

    // Fetch ERC20 transactions using the updated URL
    const response = await axios.get(erc20txns);
    console.log(response.data);
    return response.data.result;
  } catch (error) {
    // Explicitly cast 'error' to 'Error' type to resolve TypeScript error
    console.error(
      `Error fetching transaction info for address ${walletAddress}: ${
        (error as Error).message
      }`
    );
    return [];
  }
}

// Main function to fetch wallet addresses from JSON, call API, and save data to database
async function fetchAndSaveData(): Promise<void> {
  try {
    // Load wallet addresses from a JSON file
    const walletAddresses = JSON.parse(
      fs.readFileSync("./src/wallet-addresses.json", "utf8")
    );

    // Get the processed addresses from the JSON file
    const processedAddresses = JSON.parse(
      fs.readFileSync("./src/processed-addresses.json", "utf8")
    );
    const processedAddressSet = new Set(processedAddresses);

    // Filter out the addresses that haven't been processed yet
    const remainingAddresses = walletAddresses.filter(
      (address: string) => !processedAddressSet.has(address)
    );

    for (const walletAddress of remainingAddresses) {
      const transactionInfo = await fetchTransactionInfo(walletAddress);
      if (transactionInfo.length > 0) {
        //     await prisma.wallet.create({
        //       data: {
        //         address: walletAddress,
        //         transactions: {
        //           createMany: {
        //             data: transactionInfo.map((transaction: any) => ({
        //               hash: transaction.hash,
        //               blockNumber: transaction.blockNumber,
        //               timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
        //               from: transaction.from,
        //               to: transaction.to,
        //               value: transaction.value,
        //               nonce: transaction.nonce,
        //               blockHash: transaction.blockHash,
        //               transactionIndex: transaction.transactionIndex,
        //               gas: transaction.gas,
        //               gasPrice: transaction.gasPrice,
        //               isError: transaction.isError,
        //               txreceipt_status: transaction.txreceipt_status,
        //               input: transaction.input,
        //               contractAddress: transaction.contractAddress,
        //               cumulativeGasUsed: transaction.cumulativeGasUsed,
        //               gasUsed: transaction.gasUsed,
        //               confirmations: transaction.confirmations,
        //               methodId: transaction.methodId,
        //               functionName: transaction.functionName,
        //             })),
        //           },
        //         },
        //       },
        //     });

        // Add the processed address to the JSON file to avoid duplicates
        processedAddresses.push(walletAddress);
        fs.writeFileSync(
          "./src/processed-addresses.json",
          JSON.stringify(processedAddresses, null, 2)
        );
      }
    }

    console.log("Data fetching and saving complete.");
  } catch (error) {
    console.error("Error in fetchAndSaveData:", error);
  }
  //   finally {
  //     await prisma.$disconnect();
  //   }
}

// Call the main function to start the process
// fetchAndSaveData();

fetchTransactionInfo("0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");
