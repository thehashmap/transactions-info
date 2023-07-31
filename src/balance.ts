import { BigNumber } from "bignumber.js";

const transactions = [
  {
    blockNumber: "10914420",
    timeStamp: "1600806331",
    hash: "0x43d315b082ba07126b86ab37b201ef6d3aa9fd407b971310dfec47aca2fad078",
    nonce: "331",
    blockHash:
      "0xdcc64666934674b98be1bf05d21ae4546601b246a44fb1b4901c8812129026d8",
    from: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
    contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    to: "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81",
    value: "607814821714651394964",
    tokenName: "Uniswap",
    tokenSymbol: "UNI",
    tokenDecimal: "18",
    transactionIndex: "58",
    gas: "206416",
    gasPrice: "118000000000",
    gasUsed: "189286",
    cumulativeGasUsed: "4024411",
    input: "deprecated",
    confirmations: "6899200",
  },
  {
    blockNumber: "10914635",
    timeStamp: "1600809210",
    hash: "0x08a6b1b7f00966aef4ad770ea6ead0a0347228a4a747dee918e3a5280aaf664b",
    nonce: "337",
    blockHash:
      "0x03994c3a868808f9389d3c78bff61788afad9347b2c1dfe17cacd04c0d17aa19",
    from: "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81",
    contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    to: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
    value: "607814821714651394964",
    tokenName: "Uniswap",
    tokenSymbol: "UNI",
    tokenDecimal: "18",
    transactionIndex: "70",
    gas: "184659",
    gasPrice: "131000000000",
    gasUsed: "127374",
    cumulativeGasUsed: "5005119",
    input: "deprecated",
    confirmations: "6898985",
  },
  {
    blockNumber: "10920388",
    timeStamp: "1600884453",
    hash: "0x1776bdd52c1cca4822256395cf4b2933fdd7be8092c18d619ef717db2592ac5d",
    nonce: "352",
    blockHash:
      "0x0835ead194612b9cd9e3ea26c5a9d80f98b41e684f117ec10ab5143934c4c6b5",
    from: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    to: "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81",
    value: "549146534557461008763",
    tokenName: "Uniswap",
    tokenSymbol: "UNI",
    tokenDecimal: "18",
    transactionIndex: "211",
    gas: "310016",
    gasPrice: "180000000000",
    gasUsed: "195786",
    cumulativeGasUsed: "6472118",
    input: "deprecated",
    confirmations: "6893232",
  },
  {
    blockNumber: "10947476",
    timeStamp: "1601248392",
    hash: "0x2c149e704147a23a3171f4174a95a87d34efbfaaf14e8f418d742ce812c74b76",
    nonce: "375",
    blockHash:
      "0x9f09da99944ca0ab7833d38ad830f3aff299c430866f3eecc2d6e7abaf9e20ab",
    from: "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81",
    contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    to: "0xd3d2e2692501a5c9ca623199d38826e513033a17",
    value: "549146534557461008763",
    tokenName: "Uniswap",
    tokenSymbol: "UNI",
    tokenDecimal: "18",
    transactionIndex: "77",
    gas: "165489",
    gasPrice: "50000000000",
    gasUsed: "110163",
    cumulativeGasUsed: "6993390",
    input: "deprecated",
    confirmations: "6866144",
  },
];

let balance: BigNumber = new BigNumber(0);
const walletAddress: string =
  "0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81".toLowerCase();

// An array to store the balance after each transaction along with timestamp
let balanceHistory: Array<{ balance: string; date: Date }> = [];

transactions.forEach((transaction) => {
  const value: BigNumber = new BigNumber(transaction.value);
  if (transaction.from.toLowerCase() === walletAddress) {
    balance = balance.minus(value);
  } else if (transaction.to.toLowerCase() === walletAddress) {
    balance = balance.plus(value);
  }

  // Convert to common units
  const decimals: number = parseInt(transactions[0].tokenDecimal, 10);
  const balanceInCommonUnits: BigNumber = balance.dividedBy(
    new BigNumber(10).pow(decimals)
  );

  // Convert the Unix timestamp to a JavaScript Date object
  const transactionDate: Date = new Date(
    parseInt(transaction.timeStamp, 10) * 1000
  );

  // Save the balance after this transaction along with date
  balanceHistory.push({
    balance: balanceInCommonUnits.toString(),
    date: transactionDate,
  });
});

console.log("The balance history is: ");
balanceHistory.forEach((record) => {
  console.log(`At date ${record.date}, the balance was ${record.balance}`);
});
