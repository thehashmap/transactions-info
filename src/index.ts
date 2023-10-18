// src/index.ts
import { PrismaClient, Wallet, WalletStatus } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
// import { getTokenBalanceHistory } from './erc20-balance';
// import { getBalanceHistory } from './eth-balance';
// import { getLiquidity } from './pool-activity';

// dotenv.config(); // Load environment variables from .env file

const prisma = new PrismaClient();

// Utility function to fetch transaction info from Etherscan API
async function fetchTransactionInfo(walletAddress: string): Promise<any> {
  const etherscanBaseUrl = 'https://api.etherscan.io/api';
  const apiKey = process.env.ETHERSCAN_API_KEY; // Access API key from environment variable

  const uniTokenAddress = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
  const sushiTokenAddress = '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2';

  // Get the current timestamp (Unix timestamp) in seconds
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000);

  // Get the latest block number from the Etherscan API
  const latestBlockNumberResponse = await axios.get(
    `${etherscanBaseUrl}?module=block&action=getblocknobytime&timestamp=${currentTimestampInSeconds}&closest=before&apiKey=${apiKey}`,
  );
  const latestBlockNumber = latestBlockNumberResponse.data.result;
  // console.log("latestBlockNumber: ", latestBlockNumber);

  // Use the latest block number to update the URLs
  const erc20txnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&apiKey=${apiKey}`;
  // const uniTokentxnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${uniTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&apiKey=${apiKey}`;
  const erc721txnsUrl = `${etherscanBaseUrl}?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&sort=asc&apiKey=${apiKey}`;
  const txnsListUrl = `${etherscanBaseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&sort=asc&apiKey=${apiKey}`;
  const internalTxnsListUrl = `${etherscanBaseUrl}?module=account&action=txlistinternal&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&sort=asc&apiKey=${apiKey}`;
  // const sushiTokentxnsUrl = `${etherscanBaseUrl}?module=account&action=tokentx&contractaddress=${sushiTokenAddress}&address=${walletAddress}&startblock=0&endblock=${latestBlockNumber}&page=1&offset=10000&apiKey=${apiKey}`;

  // Fetch transactions data using the updated URLs
  const erc20txns = await axios.get(erc20txnsUrl);
  // const uniTokentxns = await axios.get(uniTokentxnsUrl);
  const erc721txns = await axios.get(erc721txnsUrl);
  const txnsList = await axios.get(txnsListUrl);
  const internalTxnsList = await axios.get(internalTxnsListUrl);
  // const sushiTokentxns = await axios.get(sushiTokentxnsUrl);

  return {
    erc20txns: erc20txns.data,
    // uniTokentxns: uniTokentxns.data,
    erc721txns: erc721txns.data,
    txnsList: txnsList.data,
    internalTxnsList: internalTxnsList.data,
    // sushiTokentxns: sushiTokentxns.data,
  };
}

// Get wallet ID from database using wallet address

// for testing delete
async function getWalletId(address: any) {
  const wallet = await prisma.wallet.findUnique({
    where: {
      address: address,
    },
  });

  wallet ? await deleteDataForIndexingWallet(wallet) : console.log('no wallet');

  return wallet ? wallet.id : null;
}

// Function to delete existing data for a wallet with the INDEXING status
async function deleteDataForIndexingWallet(wallet: Wallet): Promise<void> {
  try {
    // Delete ERC20 transactions associated with the wallet
    await prisma.eRC20Transaction.deleteMany({
      where: {
        walletId: wallet.id,
      },
    });

    // Delete ERC721 transactions associated with the wallet
    await prisma.eRC721Transaction.deleteMany({
      where: {
        walletId: wallet.id,
      },
    });

    // Delete regular transactions associated with the wallet
    await prisma.transaction.deleteMany({
      where: {
        walletId: wallet.id,
      },
    });

    // Delete internal transactions associated with the wallet
    await prisma.internalTransaction.deleteMany({
      where: {
        walletId: wallet.id,
      },
    });

    console.log(`Deleted data for wallet ${wallet.address} with INDEXING status.`);
  } catch (error) {
    console.error(`Error deleting data for wallet ${wallet.address}:`, error);
  }
}

// Main function to fetch wallet addresses from JSON, call API, and save data to database
async function fetchAndSaveData(): Promise<void> {
  try {
    // Fetch wallet addresses from the database
    const walletAddresses = await prisma.wallet.findMany({
      select: {
        id: true,
        address: true,
        status: true,
      },
    });

    for (const wallet of walletAddresses) {
      try {
        if (wallet.status === WalletStatus.INDEXED) {
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
          // Fetch transaction info
          const transactionInfo = await fetchTransactionInfo(wallet.address);
          console.log('transactionInfo', transactionInfo);

          if (
            transactionInfo?.erc20txns?.status !== '1' ||
            transactionInfo?.erc721txns?.status !== '1' ||
            transactionInfo?.txnsList?.status !== '1' ||
            transactionInfo?.internalTxnsList?.status !== '1'
          ) {
            throw new Error('Error fetching transaction info');
          }
          // Check the status of each transaction type before proceeding

          // getTokenBalanceHistory(transactionInfo.erc20txns.result, walletAddress);

          await prisma.eRC20Transaction.createMany({
            data: transactionInfo.erc20txns.result.map((transaction: any) => ({
              blockNumber: transaction.blockNumber,
              timeStamp: new Date(parseInt(transaction.timeStamp) * 1000).toISOString(),
              hash: transaction.hash,
              nonce: transaction.nonce,
              blockHash: transaction.blockHash,
              from: transaction.from,
              contractAddress: transaction.contractAddress,
              to: transaction.to,
              value: transaction.value,
              tokenName: transaction.tokenName,
              tokenSymbol: transaction.tokenSymbol,
              tokenDecimal: transaction.tokenDecimal,
              transactionIndex: transaction.transactionIndex,
              gas: transaction.gas,
              gasPrice: transaction.gasPrice,
              gasUsed: transaction.gasUsed,
              cumulativeGasUsed: transaction.cumulativeGasUsed,
              input: transaction.input,
              confirmations: transaction.confirmations,
              walletId: wallet.id, // Add walletId to the data
            })),
          });

          await prisma.eRC721Transaction.createMany({
            data: transactionInfo.erc721txns.result.map((transaction: any) => ({
              blockNumber: transaction.blockNumber,
              timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
              hash: transaction.hash,
              nonce: transaction.nonce,
              blockHash: transaction.blockHash,
              from: transaction.from,
              contractAddress: transaction.contractAddress,
              to: transaction.to,
              tokenID: transaction.tokenID,
              tokenName: transaction.tokenName,
              tokenSymbol: transaction.tokenSymbol,
              tokenDecimal: transaction.tokenDecimal,
              transactionIndex: transaction.transactionIndex,
              gas: transaction.gas,
              gasPrice: transaction.gasPrice,
              gasUsed: transaction.gasUsed,
              cumulativeGasUsed: transaction.cumulativeGasUsed,
              input: transaction.input,
              confirmations: transaction.confirmations,
              // walletAddress: walletAddress,
              walletId: wallet.id, // Add walletId to the data
            })),
          });

          //     getBalanceHistory(wallet.address, transactionInfo.txnsList.result);
          //   getLiquidity(transactionInfo.txnsList.result);
          await prisma.transaction.createMany({
            data: transactionInfo.txnsList.result.map((transaction: any) => ({
              hash: transaction.hash,
              blockNumber: transaction.blockNumber,
              timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
              from: transaction.from,
              to: transaction.to,
              value: transaction.value,
              nonce: transaction.nonce,
              blockHash: transaction.blockHash,
              transactionIndex: transaction.transactionIndex,
              gas: transaction.gas,
              gasPrice: transaction.gasPrice,
              isError: transaction.isError,
              txreceipt_status: transaction.txreceipt_status,
              input: transaction.input,
              contractAddress: transaction.contractAddress,
              cumulativeGasUsed: transaction.cumulativeGasUsed,
              gasUsed: transaction.gasUsed,
              confirmations: transaction.confirmations,
              methodId: transaction.methodId,
              functionName: transaction.functionName,
              walletId: wallet.id, // Add walletId to the data
            })),
          });

          //   getBalanceHistory(wallet.address, transactionInfo.internalTxnsList.result);
          // getLiquidity(transactionInfo.internalTxnsList.result);
          await prisma.internalTransaction.createMany({
            data: transactionInfo.internalTxnsList.result.map((transaction: any) => ({
              hash: transaction.hash,
              blockNumber: transaction.blockNumber,
              timeStamp: new Date(parseInt(transaction.timeStamp) * 1000),
              from: transaction.from,
              to: transaction.to,
              value: transaction.value,
              gas: transaction.gas,
              gasUsed: transaction.gasUsed,
              isError: transaction.isError,
              errCode: transaction.errCode,
              input: transaction.input,
              type: transaction.type,
              contractAddress: transaction.contractAddress,
              traceId: transaction.traceId,
              walletId: wallet.id, // Add walletId to the data
            })),
          });

          // if (transactionInfo.uniTokentxns && transactionInfo.uniTokentxns.status !== '0') {
          //   getTokenBalanceHistory(transactionInfo.uniTokentxns.result, wallet.address);
          // }

          // if (transactionInfo.sushiTokentxns && transactionInfo.sushiTokentxns.status !== '0') {
          //   getTokenBalanceHistory(transactionInfo.sushiTokentxns.result, wallet.address);
          // }
        }

        // Mark the wallet as INDEXED once all processing is complete
        await prisma.wallet.update({
          where: {
            address: wallet.address,
          },
          data: {
            status: WalletStatus.INDEXED,
          },
        });
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

    console.log('Data fetching and saving complete.');
  } catch (error) {
    console.error('Error in fetchAndSaveData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchAndSaveData();

// getWalletId("0x3ae05a6a29e7058690348a94c9de6752c9dbaad4");
// getWalletId("0x4da41be4e68b8744c48d14f270c8943be89d1167");

// fetchTransactionInfo("0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");
// fetchTransactionInfo("0x8f492f2df0546dceacfefb8f22fb9d87b6a48b81");
// fetchTransactionInfo("0x07e3a678fac8af6525216b9520b304a78b809743");

// fetchTransactionInfo('0x85905b40a61fdbadbb4372bb3ef4e9da60ebc98d');
