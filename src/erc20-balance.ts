import { BigNumber } from "bignumber.js";

export function getBalanceHistory(transactions: any[], walletAddress: string) {
  let balance: BigNumber = new BigNumber(0);
  walletAddress = walletAddress.toLowerCase();

  let balanceHistory: Array<{ balance: string; date: Date }> = [];
  let claimTime: Date | null = null;
  let dumpTime: Date | null = null;

  transactions.forEach((transaction) => {
    const value: BigNumber = new BigNumber(transaction.value);

    if (transaction.from.toLowerCase() === walletAddress) {
      balance = balance.minus(value);
      if (dumpTime === null) {
        dumpTime = new Date(parseInt(transaction.timeStamp, 10) * 1000);
      }
    } else if (transaction.to.toLowerCase() === walletAddress) {
      balance = balance.plus(value);
      if (claimTime === null) {
        claimTime = new Date(parseInt(transaction.timeStamp, 10) * 1000);
      }
    }

    const decimals: number = parseInt(transactions[0].tokenDecimal, 10);
    const balanceInCommonUnits: BigNumber = balance.dividedBy(
      new BigNumber(10).pow(decimals)
    );
    const transactionDate: Date = new Date(
      parseInt(transaction.timeStamp, 10) * 1000
    );

    balanceHistory.push({
      balance: balanceInCommonUnits.toString(),
      date: transactionDate,
    });
  });

  console.log("The balance history is: ");
  balanceHistory.forEach((record) => {
    console.log(`At date ${record.date}, the balance was ${record.balance}`);
  });

  if (claimTime && dumpTime) {
    const differenceInTime: number =
      (dumpTime as Date).getTime() - (claimTime as Date).getTime();
    const differenceInDays: number = differenceInTime / (1000 * 3600 * 24);
    console.log(`Claim time: ${claimTime}`);
    console.log(`Dump time: ${dumpTime}`);
    console.log(`Days between claim and dump: ${differenceInDays}`);
  }
}

// Call the function
// getBalanceHistory(transactions);
