import * as fs from 'fs';
import { PrismaClient, WalletStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function loadWalletAddressesFromFile(): Promise<void> {
  try {
    const walletAddresses = JSON.parse(fs.readFileSync('./src/wallet-addresses.json', 'utf8')) as string[];

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
