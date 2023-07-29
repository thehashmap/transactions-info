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
  const url = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&apiKey=${apiKey}`;

  try {
    const response = await axios.get(url);
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
    // Load wallet addresses from a JSON file (you can add more addresses here)
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
        await prisma.wallet.create({
          data: {
            address: walletAddress,
            transactions: {
              createMany: {
                data: transactionInfo.map((transaction: any) => ({
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
        fs.writeFileSync(
          "./src/processed-addresses.json",
          JSON.stringify(processedAddresses, null, 2)
        );
      }
    }

    console.log("Data fetching and saving complete.");
  } catch (error) {
    console.error("Error in fetchAndSaveData:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Call the main function to start the process
fetchAndSaveData();
