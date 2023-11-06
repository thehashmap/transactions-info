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
  const etherBalance = (Number(balance) / 1e18).toFixed(18);
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
    currentBalance += balanceChange - gasFees;
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
    const balanceChangeEther = convertBalanceToEther(balanceChange - gasFees);
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
