type Transaction = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenID: string;
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

export function getNFTBalanceHistory(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  const weeklyTransactions: Record<string, Transaction[]> = {};

  transactions.forEach((transaction) => {
    const date = new Date(parseInt(transaction.timeStamp) * 1000);
    // Construct week label as "YYYY-WW"
    const weekLabel = `${date.getUTCFullYear()}-W${Math.ceil(
      (date.getUTCDate() + 6) / 7
    )}`;

    if (weeklyTransactions[weekLabel]) {
      weeklyTransactions[weekLabel].push(transaction);
    } else {
      weeklyTransactions[weekLabel] = [transaction];
    }
  });

  return weeklyTransactions;
}

// let data = [
//   {
//     blockNumber: "13152986",
//     timeStamp: "1630675456",
//     hash: "0x77667842b1d27f91a60005163f61ff82e2ccca7ac35bc14b2c86699b2f598143",
//     nonce: "154",
//     blockHash:
//       "0x5ffb955d770e767e932eae7870fec8dc2b1895615d9ed8009ae38f9fabf5174e",
//     from: "0x0000000000000000000000000000000000000000",
//     contractAddress: "0x03ea00b0619e19759ee7ba33e8eb8e914fbf52ea",
//     to: "0x4da41be4e68b8744c48d14f270c8943be89d1167",
//     tokenID: "17397",
//     tokenName: "pLOOT",
//     tokenSymbol: "pLOOT",
//     tokenDecimal: "0",
//     transactionIndex: "76",
//     gas: "282282",
//     gasPrice: "138681634384",
//     gasUsed: "183196",
//     cumulativeGasUsed: "7944185",
//     input: "deprecated",
//     confirmations: "4676662",
//   },
//   {
//     blockNumber: "13153007",
//     timeStamp: "1630675744",
//     hash: "0x5a5e74bdee1dd5c9fa41171fcf404d6cafc563cc8197d0e5a1479cea4b5b815b",
//     nonce: "155",
//     blockHash:
//       "0xe02e33da47ef41586ee860389783f9478f1cb6e18df580c0d4a1cc7ba4e1bd78",
//     from: "0x0000000000000000000000000000000000000000",
//     contractAddress: "0x03ea00b0619e19759ee7ba33e8eb8e914fbf52ea",
//     to: "0x4da41be4e68b8744c48d14f270c8943be89d1167",
//     tokenID: "17650",
//     tokenName: "pLOOT",
//     tokenSymbol: "pLOOT",
//     tokenDecimal: "0",
//     transactionIndex: "138",
//     gas: "261090",
//     gasPrice: "176078442750",
//     gasUsed: "169068",
//     cumulativeGasUsed: "11107842",
//     input: "deprecated",
//     confirmations: "4676641",
//   },
// ];

// // Assume `data` is the array of transactions from the API
// let weeklyTransactions = getNFTBalanceHistory(data);

// // Log weekly transactions
// for (let week in weeklyTransactions) {
//   console.log(`Week: ${week}`);
//   console.log(weeklyTransactions[week]);
// }
