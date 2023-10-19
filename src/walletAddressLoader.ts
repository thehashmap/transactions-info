import * as fs from 'fs';
import { PrismaClient, WalletStatus } from '@prisma/client';
import * as XLSX from 'xlsx'; // Import the xlsx library

const prisma = new PrismaClient();

export async function loadWalletAddressesFromFile(): Promise<void> {
  try {
    const workbook = XLSX.readFile('./26K.xlsx'); // Load the Excel file
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Assuming addresses are in the first sheet

    // Extract data from the worksheet
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const walletAddresses = rows.map((row) => row[0]); // Assuming the addresses are in the first column (index 0)

    for (const walletAddress of walletAddresses) {
      // Check if the wallet address already exists in the database
      const existingWallet = await prisma.wallet.findUnique({
        where: {
          address: walletAddress,
        },
      });

      if (!existingWallet) {
        // Create a new wallet with the status NEEDS_INDEXING
        await prisma.wallet.create({
          data: {
            address: walletAddress,
            status: WalletStatus.NEEDS_INDEXING,
          },
        });
      }
    }

    console.log('Wallet addresses loaded and stored in the database.');
  } catch (error) {
    console.error('Error loading wallet addresses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await loadWalletAddressesFromFile();
}

main().catch((error) => {
  console.error('An error occurred:', error);
});
