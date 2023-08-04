import { BigNumber } from "bignumber.js";

type Transaction = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
};

export function getTokenBalanceHistory(
  transactions: Transaction[],
  walletAddress: string
) {
  let balance: BigNumber = new BigNumber(0);
  walletAddress = walletAddress.toLowerCase();

  let balanceHistory: Array<{ balance: string; date: Date }> = [];
  let weeklyBalances: { [key: string]: string } = {};
  let claimTime: Date | undefined = undefined;
  let dumpTime: Date | undefined = undefined;

  transactions.forEach((transaction) => {
    const value: BigNumber = new BigNumber(transaction.value);
    const transactionDate: Date = new Date(
      parseInt(transaction.timeStamp, 10) * 1000
    );
    const weekNumber = getWeekNumber(transactionDate);

    if (transaction.from.toLowerCase() === walletAddress) {
      balance = balance.minus(value);
      if (dumpTime === null) {
        dumpTime = transactionDate;
      }
    } else if (transaction.to.toLowerCase() === walletAddress) {
      balance = balance.plus(value);
      if (claimTime === null) {
        claimTime = transactionDate;
      }
    }

    const decimals: number = parseInt(transaction.tokenDecimal, 10);
    const balanceInCommonUnits: BigNumber = balance.dividedBy(
      new BigNumber(10).pow(decimals)
    );

    balanceHistory.push({
      balance: balanceInCommonUnits.toString(),
      date: transactionDate,
    });

    weeklyBalances[weekNumber] = balanceInCommonUnits.toString();
  });

  console.log("The balance history is: ");
  balanceHistory.forEach((record) => {
    console.log(`At date ${record.date}, the balance was ${record.balance}`);
  });

  console.log("The weekly balances are: ");
  for (const week in weeklyBalances) {
    console.log(
      `For week number ${week}, the balance was ${weeklyBalances[week]}`
    );
  }

  if (claimTime && dumpTime) {
    const differenceInTime: number =
      (dumpTime as Date).getTime() - (claimTime as Date).getTime();
    const differenceInDays: number = differenceInTime / (1000 * 3600 * 24);
    console.log(`Claim time: ${claimTime}`);
    console.log(`Dump time: ${dumpTime}`);
    console.log(`Days between claim and dump: ${differenceInDays}`);
  }
}

// Function to get week number
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7
  );
  return d.getUTCFullYear().toString() + "-" + weekNo;
}

// const transactions = [
//   {
//     blockNumber: "10887522",
//     timeStamp: "1600450076",
//     hash: "0x641985f9b22515bd00a259873105ffd110dda3d0c115391d0ee115a5814c5b6f",
//     nonce: "47",
//     blockHash:
//       "0x36848e41c873a01c62bad1dae289f4d0eef3fec63f635e3a3d3c300784964b7f",
//     from: "0xca35e32e7926b96a9988f61d510e038108d8068e",
//     contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
//     to: "0x07e3a678fac8af6525216b9520b304a78b809743",
//     value: "47540491688165099",
//     tokenName: "Uniswap",
//     tokenSymbol: "UNI",
//     tokenDecimal: "18",
//     transactionIndex: "164",
//     gas: "187094",
//     gasPrice: "276800000000",
//     gasUsed: "144404",
//     cumulativeGasUsed: "10779063",
//     input: "deprecated",
//     confirmations: "6934407",
//   },
//   {
//     blockNumber: "10887548",
//     timeStamp: "1600450361",
//     hash: "0x1612be870ac29b35a93bdec4be9b855f2848597d7b421bb9f422325bf8dd094e",
//     nonce: "49",
//     blockHash:
//       "0xb3b05b8e3d6f85e6c2c566cac92ed688807b9a63ddfe5ae46dc27d1d2219984f",
//     from: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
//     contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
//     to: "0x07e3a678fac8af6525216b9520b304a78b809743",
//     value: "530505875068801662333",
//     tokenName: "Uniswap",
//     tokenSymbol: "UNI",
//     tokenDecimal: "18",
//     transactionIndex: "149",
//     gas: "179364",
//     gasPrice: "295000001459",
//     gasUsed: "137916",
//     cumulativeGasUsed: "11309552",
//     input: "deprecated",
//     confirmations: "6934381",
//   },
//   {
//     blockNumber: "10887568",
//     timeStamp: "1600450569",
//     hash: "0x99709e0a89c49d2c958daff1313f1820f1963a2fd774f2455af93d0171253be2",
//     nonce: "50",
//     blockHash:
//       "0xd37029eb70d461047ec9ae5c83ca1574045cb17733bc230840bb0fd7871fb84e",
//     from: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
//     contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
//     to: "0x07e3a678fac8af6525216b9520b304a78b809743",
//     value: "110187004338110372427",
//     tokenName: "Uniswap",
//     tokenSymbol: "UNI",
//     tokenDecimal: "18",
//     transactionIndex: "62",
//     gas: "193458",
//     gasPrice: "295000001459",
//     gasUsed: "150728",
//     cumulativeGasUsed: "4916838",
//     input: "deprecated",
//     confirmations: "6934361",
//   },
//   {
//     blockNumber: "10887666",
//     timeStamp: "1600451968",
//     hash: "0x4aa84abda737cef26a54e1a19378529faf96718638c114f4b6ed80e53b9f808d",
//     nonce: "51",
//     blockHash:
//       "0x758b6e6fd7f4a702895b206985b138c12ea1abd53b70a11725a764fd4629e383",
//     from: "0x07e3a678fac8af6525216b9520b304a78b809743",
//     contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
//     to: "0x259930bbad6698b5a58a62a8d302eaa447a8c947",
//     value: "640740419898600199859",
//     tokenName: "Uniswap",
//     tokenSymbol: "UNI",
//     tokenDecimal: "18",
//     transactionIndex: "204",
//     gas: "83295",
//     gasPrice: "299000000000",
//     gasUsed: "40530",
//     cumulativeGasUsed: "11348079",
//     input: "deprecated",
//     confirmations: "6934263",
//   },
// ];

// // Call the function
// getTokenBalanceHistory(transactions, "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");