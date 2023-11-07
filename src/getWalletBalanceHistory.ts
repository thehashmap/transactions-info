import { PrismaClient, Wallet, WalletStatus } from '@prisma/client';

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
  const externalTransactions = await prisma.transaction.findMany({
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
  const combinedTransactions = [...externalTransactions, ...internalTransactions].sort((a, b) => a.timeStamp.getTime() - b.timeStamp.getTime());

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
    console.log(
      `Wallet: ${walletAddress}, Timestamp: ${tx.timeStamp.toISOString()}, Current Balance (Ether): ${currentBalanceEther}, Previous Balance (Ether): ${previousBalanceEther}, Balance Change (Ether): ${balanceChangeEther}`,
    );

    // Save balance history to the database
    await saveBalanceHistoryToDB(walletId, {
      timeStamp: tx.timeStamp,
      currentBalance,
      previousBalance,
      balanceChange,
      walletAddress,
    });
  }

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
calculateBalancesForAllWallets()
  .then(() => {
    console.log('Balance calculation completed');
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
