# Ethereum Wallet Transactions Fetcher

This is a Node.js application that fetches transaction information for Ethereum wallet addresses using the Etherscan API. The fetched data is then stored in a CockroachDB database using Prisma.

## Setup

### Obtain Etherscan API Key

To use the Etherscan API, you need to obtain an API key by signing up on the Etherscan website: [https://etherscan.io/apis](https://etherscan.io/apis). Once you have the API key, you can set it as an environment variable.

### Obtain CockroachDB URL

You need a CockroachDB account. If you don't have one, you can sign up for free at https://cockroachlabs.com.

## Installation

Clone this repository and navigate to the project directory:

```bash
git clone https://github.com/thehashmap/transactions-info.git
cd transactions-info
```

### Install the dependencies:

```bash
npm install
```

### Running the Application

Set the Etherscan API key and CockroachDB url as environment variables. See .env.example for sample.

### DB Update to latest schema

```bash
npx prisma db push
npx prisma generate
```

### Run the script to fetch and save wallet transaction data:

```bash
npm run start
```
