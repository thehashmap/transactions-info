import { BigNumber } from 'bignumber.js';

type Transaction = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
};

export const getLiquidity = (transactions: Transaction[]) => {
  const UNISWAP_V2_ROUTER_ADDRESS = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'; // Uniswap v2 router address
  const UNISWAP_V3_ROUTER_ADDRESS = '0xe592427a0aece92de3edee1f18e0157c05861564'; // Uniswap v3 router address
  const SUSHISWAP_ROUTER_ADDRESS = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'; // Sushiswap router address
  const ONEINCH_ROUTER_ADDRESS = '0x11111112542d85b3ef69ae05771c2dccff4faa26'; // 1inch router address

  const uniswapv2Transactions: { time: string; value: BigNumber }[] = [];
  const uniswapv3Transactions: { time: string; value: BigNumber }[] = [];
  const sushiswapTransactions: { time: string; value: BigNumber }[] = [];
  const oneinchTransactions: { time: string; value: BigNumber }[] = [];

  let uniswapv2Total = new BigNumber(0);
  let uniswapv3Total = new BigNumber(0);
  let sushiswapTotal = new BigNumber(0);
  let oneinchTotal = new BigNumber(0);

  transactions.forEach((tx) => {
    const time = new Date(Number(tx.timeStamp) * 1000).toISOString();
    const value = new BigNumber(tx.value);
    const ether = value.dividedBy(new BigNumber('1e18')).toFixed();

    if (tx.to.toLowerCase() === UNISWAP_V2_ROUTER_ADDRESS.toLowerCase()) {
      if (tx.functionName.startsWith('addLiquidity')) {
        uniswapv2Transactions.push({ time, value: value });
        uniswapv2Total = uniswapv2Total.plus(value);
        console.log('v2', uniswapv2Total.dividedBy(new BigNumber('1e18')).toFixed());
      } else if (tx.functionName.startsWith('removeLiquidity')) {
        uniswapv2Transactions.push({ time, value: value.negated() });
        uniswapv2Total = uniswapv2Total.minus(value);
        console.log('v2', uniswapv2Total.dividedBy(new BigNumber('1e18')).toFixed());
      }
    } else if (tx.to.toLowerCase() === UNISWAP_V3_ROUTER_ADDRESS.toLowerCase()) {
      if (tx.functionName.startsWith('addLiquidity')) {
        uniswapv3Transactions.push({ time, value: value });
        uniswapv3Total = uniswapv3Total.plus(value);
        console.log('v3', uniswapv3Total.dividedBy(new BigNumber('1e18')).toFixed());
      } else if (tx.functionName.startsWith('removeLiquidity')) {
        uniswapv3Transactions.push({ time, value: value.negated() });
        uniswapv3Total = uniswapv3Total.minus(value);
        console.log('v3', uniswapv3Total.dividedBy(new BigNumber('1e18')).toFixed());
      }
    } else if (tx.to.toLowerCase() === SUSHISWAP_ROUTER_ADDRESS.toLowerCase()) {
      if (tx.functionName.startsWith('addLiquidity')) {
        sushiswapTransactions.push({ time, value: value });
        sushiswapTotal = sushiswapTotal.plus(value);
        console.log('sushi', sushiswapTotal.dividedBy(new BigNumber('1e18')).toFixed());
      } else if (tx.functionName.startsWith('removeLiquidity')) {
        sushiswapTransactions.push({ time, value: value.negated() });
        sushiswapTotal = sushiswapTotal.minus(value);
        console.log('sushi', sushiswapTotal.dividedBy(new BigNumber('1e18')).toFixed());
      }
    } else if (tx.to.toLowerCase() === ONEINCH_ROUTER_ADDRESS.toLowerCase()) {
      if (tx.functionName.startsWith('addLiquidity')) {
        oneinchTransactions.push({ time, value: value });
        oneinchTotal = oneinchTotal.plus(value);
        console.log('1inch', oneinchTotal.dividedBy(new BigNumber('1e18')).toFixed());
      } else if (tx.functionName.startsWith('removeLiquidity')) {
        oneinchTransactions.push({ time, value: value.negated() });
        oneinchTotal = oneinchTotal.minus(value);
        console.log('1inch', oneinchTotal.dividedBy(new BigNumber('1e18')).toFixed());
      }
    }
  });

  console.log('Uniswap V2: ', uniswapv2Transactions);
  console.log('Uniswap V3: ', uniswapv3Transactions);
  console.log('Sushiswap: ', sushiswapTransactions);
  console.log('OneInch: ', oneinchTransactions);

  return {
    uniswapV2: uniswapv2Transactions,
    uniswapV3: uniswapv3Transactions,
    sushiswap: sushiswapTransactions,
    oneInch: oneinchTransactions,
  };
};
