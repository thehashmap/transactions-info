import { PrismaClient } from '@prisma/client';

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
  const etherBalance = (Number(balance) / 1e18).toFixed(17);
  return etherBalance;
}

async function getWalletBalanceHistory(walletAddress: string): Promise<BalanceChange[]> {
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
    // Skip reverted transactions
    if (tx.isError === '1') {
      continue;
    }

    let balanceChange = BigInt(0);

    // Add to balance if this wallet is the receiver
    if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
      balanceChange += BigInt(tx.value);
    }

    // Subtract from balance if this wallet is the sender
    if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
      balanceChange -= BigInt(tx.value);
      // Subtract gas only for external transactions
      if ('gasUsed' in tx && 'gasPrice' in tx) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        balanceChange -= gasUsed * gasPrice;
      }
    }

    // Apply the balance change and record it with the timestamp
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
  }

  return balanceChanges;
}

async function calculateBalancesForAllWallets(): Promise<void> {
  // Get all wallet addresses from the database
  const walletAddresses = await prisma.wallet.findMany();

  for (const wallet of walletAddresses) {
    const walletAddress = wallet.address;
    console.log(`Fetching balance changes for wallet: ${walletAddress}`);
    const balanceChanges = await getWalletBalanceHistory(walletAddress);
    console.log(`Balance changes for wallet: ${walletAddress}`, balanceChanges);
  }
}

// Example usage:
calculateBalancesForAllWallets().catch((e) => console.error(e));
