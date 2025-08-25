# Web3 钱包组件

一个基于 React + TypeScript + Zustand 的现代化 Web3 钱包连接组件，支持多网络、ENS 集成和持久化存储。

## ✨ 功能特性

- 🔗 **多钱包支持** - 支持 MetaMask 等 EIP-1193 兼容钱包
- 🌐 **多网络支持** - 支持 Ethereum、BSC、Sepolia 等主流网络
- 📝 **ENS 集成** - 自动解析 ENS 名称和头像
- 💾 **状态持久化** - 使用 Zustand 自动保存连接状态
- 🎨 **现代化 UI** - 基于 Tailwind CSS 的美观界面
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🔒 **安全可靠** - 完整的错误处理和状态管理

## 🚀 快速开始

### 安装依赖

```bash
npm install zustand ethers lucide-react
```

### 基本使用

```tsx
import Wallet from './components/Wallet';

function App() {
  return (
    <div>
      <Wallet />
    </div>
  );
}
```

## 📦 组件结构

```
src/
├── components/
│   └── Wallet.tsx          # 钱包组件
└── stores/
    └── walletStore.ts      # Zustand 状态管理
```

## 🎯 核心功能

### 1. 钱包连接

- **自动检测** MetaMask 是否已安装
- **一键连接** 钱包账户
- **状态同步** 实时更新连接状态
- **持久化** 刷新页面保持连接状态

### 2. 网络管理

支持的网络：
- **Ethereum Mainnet** (`0x1`) - 以太坊主网
- **Binance Smart Chain** (`0x38`) - BSC 网络
- **Sepolia Testnet** (`0xaa36a7`) - Sepolia 测试网

功能：
- **网络切换** 支持一键切换网络
- **自动添加** 如果钱包中没有对应网络，会自动添加
- **状态同步** 网络切换后自动更新余额和 ENS 信息

### 3. ENS 集成

- **自动解析** ENS 名称和头像
- **智能显示** 有 ENS 时显示 ENS 名称，无 ENS 时显示地址
- **网络感知** 只在以太坊主网查询 ENS 信息
- **错误处理** ENS 查询失败时的降级处理

### 4. 状态管理

使用 Zustand 进行状态管理：

```tsx
import { useWalletStore } from './stores/walletStore';

// 获取钱包状态
const { address, chainId, isConnected, balance, ensName } = useWalletStore();

// 连接钱包
const { connectWallet } = useWalletStore();
await connectWallet();

// 断开连接
const { disconnectWallet } = useWalletStore();
disconnectWallet();
```

## 🔧 API 文档

### Wallet 组件 Props

组件无需传入任何 props，所有状态通过 Zustand store 管理。

### Zustand Store API

#### 状态属性

```tsx
interface WalletState {
  address: string | null;        // 钱包地址
  chainId: string | null;        // 当前网络 ID
  isConnected: boolean;          // 连接状态
  balance: string;               // 账户余额
  ensName: string | null;        // ENS 名称
  ensAvatar: string | null;      // ENS 头像 URL
}
```

#### 方法

```tsx
// 连接钱包
connectWallet(): Promise<void>

// 断开连接
disconnectWallet(): void

// 切换网络
switchNetwork(networkKey: 'ethereum' | 'bsc' | 'sepolia'): Promise<void>

// 设置钱包状态
setWallet(wallet: Partial<WalletState>): void

// 重置钱包状态
resetWallet(): void

// 获取余额
getBalance(address: string): Promise<string>

// 获取 ENS 信息
getENSInfo(address: string, chainId?: string): Promise<{ ensName: string | null; ensAvatar: string | null }>

// 格式化地址
formatAddress(address: string): string

// 格式化余额
formatBalance(balance: string): string

// 获取当前网络信息
getCurrentNetwork(): Network | null

// 检查 MetaMask 是否已安装
isMetaMaskInstalled(): boolean
```

## 🎨 UI 组件

### 连接状态

- **未连接**：显示"连接钱包"按钮
- **连接中**：显示加载状态
- **已连接**：显示钱包信息卡片

### 钱包信息卡片

包含以下信息：
- **头像**：ENS 头像或默认钱包图标
- **名称**：ENS 名称或格式化的钱包地址
- **余额**：当前网络的原生代币余额
- **网络**：当前连接的网络名称

### 网络切换

- **下拉菜单**：显示所有支持的网络
- **当前网络**：高亮显示当前连接的网络
- **自动添加**：如果钱包中没有对应网络会自动添加

### 详情弹窗

点击钱包信息卡片可查看详细信息：
- **完整地址**：可复制的完整钱包地址
- **网络信息**：当前网络的详细信息
- **余额详情**：精确的余额显示
- **ENS 信息**：如果有 ENS 名称会单独显示

## 🔄 状态持久化

### 自动保存

- **连接状态**：钱包连接后自动保存到 localStorage
- **网络信息**：当前网络信息会被保存
- **ENS 信息**：ENS 名称和头像会被保存

### 自动恢复

- **页面刷新**：刷新页面后自动恢复连接状态
- **网络切换**：自动检测并同步网络状态
- **账户切换**：自动检测账户变化并更新状态

### 清理机制

- **断开连接**：主动断开连接时清理存储
- **账户切换**：账户数量为 0 时清理存储
- **组件卸载**：组件卸载时根据用户意图决定是否清理

## 🛠️ 自定义配置

### 添加新网络

在 `walletStore.ts` 中的 `NETWORKS` 对象添加新网络：

```tsx
export const NETWORKS = {
  // ... 现有网络
  polygon: {
    chainId: "0x89",
    chainName: "Polygon",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: ["https://polygon-rpc.com/"],
    blockExplorerUrls: ["https://polygonscan.com/"],
  },
};
```

### 自定义样式

组件使用 Tailwind CSS 类名，可以通过修改类名来自定义样式：

```tsx
// 修改连接按钮样式
<button className="custom-connect-button">
  连接钱包
</button>

// 修改钱包信息卡片样式
<div className="custom-wallet-card">
  {/* 钱包信息 */}
</div>
```

## 🐛 错误处理

### 常见错误

1. **MetaMask 未安装**
   - 自动检测并提示用户安装
   - 提供友好的错误信息

2. **网络切换失败**
   - 自动尝试添加网络
   - 提供详细的错误日志

3. **ENS 查询失败**
   - 降级到显示地址
   - 不影响其他功能

4. **余额获取失败**
   - 显示默认值 "0"
   - 记录错误日志

### 调试模式

启用调试模式查看详细日志：

```tsx
// 在控制台查看钱包状态变化
const wallet = useWalletStore();
console.log('Wallet state:', wallet);
```

## 📱 浏览器兼容性

- ✅ Chrome (推荐)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ IE (不支持)

## 🔒 安全考虑

- **本地存储**：敏感信息只存储在本地
- **权限控制**：只请求必要的钱包权限
- **错误处理**：不暴露敏感错误信息
- **状态验证**：验证所有状态变化的合法性

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Zustand](https://github.com/pmndrs/zustand) - 轻量级状态管理
- [Ethers.js](https://github.com/ethers-io/ethers.js/) - Ethereum 库
- [Lucide React](https://github.com/lucide-icons/lucide) - 图标库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系维护者

---

**注意**：这是一个演示项目，在生产环境中使用前请进行充分的安全测试。 