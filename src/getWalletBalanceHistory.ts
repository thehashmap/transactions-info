import { PrismaClient, Wallet, WalletStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface BalanceChange {
  walletAddress: string;
  timeStamp: Date;
  currentBalance: bigint;
  previousBalance: bigint;
  balanceChange: bigint;
}

// Convert a big integer balance to Ether with up to 8 decimal places
function convertBalanceToEther(balance: bigint): string {
  const etherBalance = (Number(balance) / 1e18).toFixed(18);
  return etherBalance;
}

// Function to delete existing data for a wallet with the INDEXING status
async function deleteDataForIndexingWallet(wallet: Wallet): Promise<void> {
  try {
    // Delete history associated with the wallet
    await prisma.balanceHistory.deleteMany({
      where: {
        walletId: wallet.id,
      },
    });

    console.log(`Deleted data for wallet ${wallet.address} with INDEXING status.`);
  } catch (error) {
    console.error(`Error deleting data for wallet ${wallet.address}:`, error);
  }
}

async function saveBalanceHistoryToDB(walletId: string, balanceChange: BalanceChange): Promise<void> {
  await prisma.balanceHistory.create({
    data: {
      wallet: {
        connect: { id: walletId },
      },
      timeStamp: balanceChange.timeStamp,
      currentBalance: convertBalanceToEther(balanceChange.currentBalance),
      previousBalance: convertBalanceToEther(balanceChange.previousBalance),
      balanceChange: convertBalanceToEther(balanceChange.balanceChange),
    },
  });
}

async function getWalletBalanceHistory(walletId: string, walletAddress: string): Promise<BalanceChange[]> {
  const balanceChanges: BalanceChange[] = [];
  let currentBalance = BigInt(0);
  let previousBalance = BigInt(0);

  // Get all external transactions ordered by timestamp
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ from: walletAddress }, { to: walletAddress }],
    },
    orderBy: {
      timeStamp: 'asc',
    },
  });

  // Get all internal transactions ordered by timestamp
  const internalTransactions = await prisma.internalTransaction.findMany({
    where: {
      OR: [{ from: walletAddress }, { to: walletAddress }],
    },
    orderBy: {
      timeStamp: 'asc',
    },
  });

  // Combine and sort transactions by timeStamp
  const combinedTransactions = [...transactions, ...internalTransactions].sort((a, b) => a.timeStamp.getTime() - b.timeStamp.getTime());
  let lastTransaction = null;
  let lastBalanceChange = null;

  // Open a write stream to a file (replace 'output.txt' with your desired file name)
  const outputStream = fs.createWriteStream('output.txt');

  for (const tx of combinedTransactions) {
    let balanceChange = BigInt(0);
    let gasFees = BigInt(0);
    let reverted = false;

    // Check if the transaction is reverted (isError = 1)
    if (tx.isError === '1') {
      reverted = true;
    }

    // Calculate gas fees only when the wallet sends funds (balance is deducted)
    if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
      if ('gasUsed' in tx && 'gasPrice' in tx) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        gasFees = gasUsed * gasPrice;
        balanceChange -= gasFees;
      }
    }

    // Add to balance if this wallet is the receiver and the transaction is not reverted
    if (tx.to.toLowerCase() === walletAddress.toLowerCase() && !reverted) {
      balanceChange += BigInt(tx.value);
    }

    // Subtract from balance if this wallet is the sender and the transaction is not reverted
    if (tx.from.toLowerCase() === walletAddress.toLowerCase() && !reverted) {
      balanceChange -= BigInt(tx.value);
    }

    if (lastTransaction !== null && tx.timeStamp.toISOString() == lastTransaction.timeStamp.toISOString() && balanceChange == lastBalanceChange) {
      console.log('tx timestamp: ', tx.timeStamp);
      console.log('lastTransaction timestamp: ', lastTransaction.timeStamp);
      console.log('skipping');
      console.log('balanceChange: ', balanceChange);
      console.log('lastBalanceChange: ', lastBalanceChange);
      console.log(reverted);

      // Write the additional log statements to the file
      outputStream.write(`tx timestamp: ${tx.timeStamp}\n`);
      outputStream.write(`lastTransaction timestamp: ${lastTransaction.timeStamp}\n`);
      outputStream.write('skipping\n');
      outputStream.write(`balanceChange: ${balanceChange}\n`);
      outputStream.write(`lastBalanceChange: ${lastBalanceChange}\n`);
      outputStream.write(`Reverted: ${reverted}\n`);

      let flag = false;

      if (tx.hash == lastTransaction.hash) {
        flag = true;
      }

      lastTransaction = tx;
      lastBalanceChange = balanceChange;
      if (flag) continue;
    }

    // Apply the balance change, record gas fees, and record if the transaction was reverted
    previousBalance = currentBalance;
    currentBalance += balanceChange;
    balanceChanges.push({
      timeStamp: tx.timeStamp,
      currentBalance,
      previousBalance,
      balanceChange,
      walletAddress,
    });

    // Print balance change for each transaction
    const currentBalanceEther = convertBalanceToEther(currentBalance);
    const previousBalanceEther = convertBalanceToEther(previousBalance);
    const balanceChangeEther = convertBalanceToEther(balanceChange);
    const logString = `Wallet: ${walletAddress}, Timestamp: ${tx.timeStamp.toISOString()}, Current Balance (Ether): ${currentBalanceEther}, Previous Balance (Ether): ${previousBalanceEther}, Balance Change (Ether): ${balanceChangeEther}, isError: ${
      tx.isError
    }, reverted: ${reverted}`;

    console.log(logString);

    // Write the log to the file
    outputStream.write(logString + '\n');

    // Save balance history to the database
    // await saveBalanceHistoryToDB(walletId, {
    //   timeStamp: tx.timeStamp,
    //   currentBalance,
    //   previousBalance,
    //   balanceChange,
    //   walletAddress,
    // });

    lastTransaction = tx;
    lastBalanceChange = balanceChange;
  }
  // Close the write stream when the program is finished
  outputStream.end();

  return balanceChanges;
}

async function calculateBalancesForAllWallets(): Promise<void> {
  // Get all wallet addresses from the database
  const walletAddresses = await prisma.wallet.findMany({
    select: {
      id: true,
      address: true,
      status: true,
    },
  });

  for (const wallet of walletAddresses) {
    try {
      if (wallet.status === WalletStatus.NEEDS_INDEXING) {
        continue;
      } else {
        if (wallet.status === WalletStatus.INDEXING) {
          // Wallet is currently being indexed, delete existing data and set to NEEDS_INDEXING
          await deleteDataForIndexingWallet(wallet);
        }
        // Mark the wallet as INDEXING once all processing starts
        await prisma.wallet.update({
          where: {
            address: wallet.address,
          },
          data: {
            status: WalletStatus.INDEXING,
          },
        });
        const walletId = wallet.id;
        const walletAddress = wallet.address;
        console.log(`Fetching balance changes for wallet: ${walletAddress}`);
        const balanceChanges = await getWalletBalanceHistory(walletId, walletAddress);
        console.log(`Balance history for wallet: ${walletAddress}`);

        for (const change of balanceChanges) {
          console.log(
            `Timestamp: ${change.timeStamp.toISOString()}, ` +
              `Current Balance: ${convertBalanceToEther(change.currentBalance)}, ` +
              `Previous Balance: ${convertBalanceToEther(change.previousBalance)}, ` +
              `Balance Change: ${convertBalanceToEther(change.balanceChange)}, `,
          );
        }
        // Mark the wallet as INDEXED once all processing is complete
        await prisma.wallet.update({
          where: {
            address: wallet.address,
          },
          data: {
            status: WalletStatus.NEEDS_INDEXING,
          },
        });
      }
    } catch (e) {
      await prisma.wallet.update({
        where: {
          address: wallet.address,
        },
        data: {
          status: WalletStatus.ERROR,
        },
      });

      console.log(e);
    }
  }
}

// Example usage:
// calculateBalancesForAllWallets()
//   .then(() => {
//     console.log('Balance calculation completed');
//     prisma.$disconnect();
//   })
//   .catch((e) => {
//     console.error(e);
//     prisma.$disconnect();
//   });

// getWalletBalanceHistory('id', '0x004e0c9d0923b8ffb995830bc8ae0bb3e83c3bde');
// getWalletBalanceHistory('id', '0x986b3b04523c0fd690b2fcf7cd114fc2b7d9e740');
// getWalletBalanceHistory('id', '0xca317ef5f8978c36c1065184fde08d9dd7c36cfe');
// getWalletBalanceHistory('id', '0xf03b5f229a14b53094d9566642fb5e2e7273586d');
// getWalletBalanceHistory('id', '0xba2bdef55e002be35bb1be787c0c9e95781e0ca6');
getWalletBalanceHistory('id', '0xe07e487d5a5e1098bbb4d259dac5ef83ae273f4e');
// getWalletBalanceHistory('id', '0x469adaf766fb35f1a3c2569fe8c57a50f4b39131'); // wrong isError values
