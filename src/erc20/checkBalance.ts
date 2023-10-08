import { getTokenBalanceHistory } from '../erc20-balance';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export default async function checkBalance() {
  const transactions = await prisma.eRC20Transaction.findMany({
    where: {
      contractAddress: {
        equals: '0x6B175474E89094C44Da98b954EedeAC495271d0F'.toLowerCase(),
      },
      OR: [
        {
          to: {
            equals: '0x4dA41Be4E68B8744C48d14F270C8943bE89d1167'.toLowerCase(),
          },
        },
        {
          from: {
            equals: '0x4dA41Be4E68B8744C48d14F270C8943bE89d1167'.toLowerCase(),
          },
        },
      ],
    },
  });

  console.log('transactions', transactions.length);
  await getTokenBalanceHistory(transactions, '0x4dA41Be4E68B8744C48d14F270C8943bE89d1167');
}

checkBalance();
