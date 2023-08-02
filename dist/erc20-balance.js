"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalanceHistory = void 0;
const bignumber_js_1 = require("bignumber.js");
function getBalanceHistory(transactions, walletAddress) {
    let balance = new bignumber_js_1.BigNumber(0);
    walletAddress = walletAddress.toLowerCase();
    let balanceHistory = [];
    let claimTime = null;
    let dumpTime = null;
    transactions.forEach((transaction) => {
        const value = new bignumber_js_1.BigNumber(transaction.value);
        if (transaction.from.toLowerCase() === walletAddress) {
            balance = balance.minus(value);
            if (dumpTime === null) {
                dumpTime = new Date(parseInt(transaction.timeStamp, 10) * 1000);
            }
        }
        else if (transaction.to.toLowerCase() === walletAddress) {
            balance = balance.plus(value);
            if (claimTime === null) {
                claimTime = new Date(parseInt(transaction.timeStamp, 10) * 1000);
            }
        }
        const decimals = parseInt(transactions[0].tokenDecimal, 10);
        const balanceInCommonUnits = balance.dividedBy(new bignumber_js_1.BigNumber(10).pow(decimals));
        const transactionDate = new Date(parseInt(transaction.timeStamp, 10) * 1000);
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
        const differenceInTime = dumpTime.getTime() - claimTime.getTime();
        const differenceInDays = differenceInTime / (1000 * 3600 * 24);
        console.log(`Claim time: ${claimTime}`);
        console.log(`Dump time: ${dumpTime}`);
        console.log(`Days between claim and dump: ${differenceInDays}`);
    }
}
exports.getBalanceHistory = getBalanceHistory;
// Call the function
// getBalanceHistory(transactions);
