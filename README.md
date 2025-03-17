# 🎲 Axie Garuda Gacha Roller

🎮 Automate bulk purchases of Lucky Pouches from Garuda Shrine Shop.

### 📊 Compact Mode (Default)

![Compact Mode](https://github.com/user-attachments/assets/cac68954-a6ef-4e9b-a7aa-d37e084a7b18)

### 📈 Verbose Mode

![Verbose Mode](https://github.com/user-attachments/assets/7e371504-f924-490d-89fb-f95691be689a)

> ⚠️ **Warning** > **Run it locally and preferably on an encrypted volume, your private keys can be exposed!**

## 📋 Prerequisites

- 📦 Node.js 18+
- 🔧 One of the following package managers (in order of preference):
  - 🚀 bun (will use bun in the example)
  - ⚡ pnpm
  - 🧶 yarn
  - 📦 npm
- 🔑 Access Token from app.axie:
  1. Go to https://app.axieinfinity.com
  2. Open Browser Developer Tools (F12)
  3. Go to Application tab
  4. Under Storage, expand Local Storage
  5. Click on https://app.axieinfinity.com
  6. Find and copy the value of "accessToken"
- 🔐 SkyMavis API Key:
  1. Go to https://developers.skymavis.com
  2. Create an account or log in
  3. Create a dApp and get your API key

## 🛠️ Installation

1. Install dependencies (choose one):

```bash
bun install
# or
pnpm install
# or
yarn install
# or
npm install
```

2. Create your .env file:

```bash
cp .env.example .env
```

3. Edit .env file and add required values:

- 🔐 Your private key
- 🎫 Access Token from app.axie (obtained from steps above)
- 🔑 SkyMavis API Key (obtained from developers.skymavis.com)

Optional:
- 🔗 Custom Ronin RPC URL (e.g., from Alchemy or other providers)
  - If not provided, will use SkyMavis RPC with your API key

## ✨ Features

### 🎮 Command Line Options

- `--amount X` or just `X` - Number of max bulk purchases (1 means 100 pouches) to execute (default: 1)
- `--premium` - Buy premium Lucky Pouches instead of regular ones
- `--verbose` - Show detailed output including transaction hashes and reward breakdowns
- `--delegator <address>` - Roll pouches for another address (delegator has to delegate to this address first)

### 💫 Transaction Details

- 🎁 Each transaction purchases 100 Lucky Pouches (can be configured in `src/config.ts`)
- 📜 Regular pouch costs 10 slips
- 🌟 Premium pouch costs 50 slips
- ⏱️ 60-second cooldown between transactions
- ⚡ Automatic gas estimation and balance checks

### 🏆 Reward Tracking

The tool tracks and displays:

- 🥥 Coco rewards
- ✨ Premium Coco rewards
- 🐚 Spirit Shell rewards
- 🦊 Axie rewards (if any)

## 📖 Usage Examples

### 🔰 Basic Usage

Will use bun as the package manager. You can replace it with pnpm, yarn or npm.

```bash
# Roll 100 regular pouches (default)
bun start

# Roll 3x 100 regular pouches
bun start 3

# Roll 5x 100 premium pouches
bun start 5 --premium
```

### 🚀 Advanced Usage

```bash
# Roll 2x 100 premium pouches with detailed output
bun start 2 --premium --verbose

# Roll 3x 100 pouches for another address
bun start 3 --delegator 0xDelegatorAddress
```

### 📊 Verbose Mode Features

When using `--verbose`, you'll see:

- 📝 Detailed transaction information
- 🔗 Transaction hashes
- 📦 Itemized reward breakdowns
- ⏳ Cooldown timers
- 📈 Batch progress

---

🎰 Happy rolling and may RNGesus be with you! 🙏
