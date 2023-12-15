# Axie Garuda Gacha Roller

Automate bulk purchases of Lucky Pouches from Garuda Shrine Shop.

> **Warning**
> **Run it locally and preferably on an encrypted volume, your private keys can be exposed!**

## Prerequisites
- Node.js 18+
- pnpm (or Yarn/NPM)

## Installation
- Install dependencies
```bash
pnpm i
```
- Make your own local copy of .env file
```bash
cp .env.example .env
```

- Edit .env file and add your private key and a Sky Mavis API key (obtainable on [Sky Mavis Developer Portal](https://developers.skymavis.com/console/applications/))


## Using the Garuda Gacha Roller

This tool accepts two arguments:
- `--amount X` - number of transactions to execute. Each transaction is a purchase of 100 Lucky Pouches.
- `--premium` - buy premium Lucky Pouches instead of regular ones.

The tool will wait 60 seconds in between each transaction. The limit is imposed by the backend responsible for issuing purchase signatures.

Example:
- Buy 300 Lucky Pouches
```bash
npx hardhat shop --amount 3
```


- Buy 500 Premium Lucky Pouches
```bash
npx hardhat shop --premium --amount 3
```

Thanks [@alexx855](https://github.com/alexx855) for the `access-token.ts`!