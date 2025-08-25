import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Wallet, ChevronDown, Globe, Check } from "lucide-react";

// 扩展 Window 接口以包含 ethereum
declare global {
	interface Window {
		ethereum?: {
			request: (args: { method: string; params?: any[] }) => Promise<any>;
			on: (eventName: string, handler: (...args: any[]) => void) => void;
			removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
			isMetaMask?: boolean;
		};
	}
}

// 网络配置
const NETWORKS = {
	ethereum: {
		chainId: "0x1",
		chainName: "Ethereum Mainnet",
		nativeCurrency: {
			name: "Ether",
			symbol: "ETH",
			decimals: 18,
		},
		rpcUrls: ["https://mainnet.infura.io/v3/"],
		blockExplorerUrls: ["https://etherscan.io/"],
	},
	bsc: {
		chainId: "0x38",
		chainName: "Binance Smart Chain",
		nativeCurrency: {
			name: "BNB",
			symbol: "BNB",
			decimals: 18,
		},
		rpcUrls: ["https://bsc-dataseed1.binance.org/"],
		blockExplorerUrls: ["https://bscscan.com/"],
	},
	sepolia: {
		chainId: "0xaa36a7",
		chainName: "Sepolia Testnet",
		nativeCurrency: {
			name: "Sepolia Ether",
			symbol: "ETH",
			decimals: 18,
		},
		rpcUrls: ["https://sepolia.infura.io/v3/", "https://rpc.sepolia.org/", "https://sepolia.gateway.tenderly.co/"],
		blockExplorerUrls: ["https://sepolia.etherscan.io/"],
	},
};

interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  balance: string;
  ensName: string | null;
  ensAvatar: string | null;
}

const WalletComponent: React.FC = () => {
	const [wallet, setWallet] = useState<WalletState>({
		address: null,
		chainId: null,
		isConnected: false,
		balance: "0",
		ensName: null,
		ensAvatar: null,
	});
	const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);

	// 检查 MetaMask 是否已安装
	const isMetaMaskInstalled = () => {
		return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
	};

	// 获取当前网络信息
	const getCurrentNetwork = () => {
		const networkKey = Object.keys(NETWORKS).find((key) => NETWORKS[key as keyof typeof NETWORKS].chainId === wallet.chainId);
		return networkKey ? NETWORKS[networkKey as keyof typeof NETWORKS] : null;
	};

	// 格式化地址
	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	// 格式化余额
	const formatBalance = (balance: string) => {
		const num = parseFloat(balance);
		return num < 0.0001 ? "0" : num.toFixed(4);
	};

	// 获取账户余额
	const getBalance = async (address: string) => {
		try {
			if (window.ethereum) {
				const provider = new ethers.BrowserProvider(window.ethereum);
				const balance = await provider.getBalance(address);
				return ethers.formatEther(balance);
			}
		} catch (error) {
			console.error("获取余额失败:", error);
		}
		return "0";
	};

	// 获取 ENS 信息
	const getENSInfo = async (address: string) => {
		try {
			// 只有在以太坊主网时才查询 ENS
			if (wallet.chainId === "0x1" && window.ethereum) {
				const provider = new ethers.BrowserProvider(window.ethereum);
				const ensName = await provider.lookupAddress(address);
				let ensAvatar = null;

				if (ensName) {
					try {
						const resolver = await provider.getResolver(ensName);
						if (resolver) {
							ensAvatar = await resolver.getAvatar();
						}
					} catch (error) {
						console.log("获取 ENS 头像失败:", error);
					}
				}

				return { ensName, ensAvatar };
			}
		} catch (error) {
			console.error("获取 ENS 信息失败:", error);
		}
		return { ensName: null, ensAvatar: null };
	};

	// 连接钱包
	const connectWallet = async () => {
		if (!isMetaMaskInstalled()) {
			alert("请安装 MetaMask 钱包！");
			return;
		}

		try {
			setIsConnecting(true);
			const accounts = await window.ethereum!.request({
				method: "eth_requestAccounts",
			});

			if (accounts.length > 0) {
				const address = accounts[0];
				const chainId = await window.ethereum!.request({ method: "eth_chainId" });
				const balance = await getBalance(address);
				const { ensName, ensAvatar } = await getENSInfo(address);

				setWallet({
					address,
					chainId,
					isConnected: true,
					balance,
					ensName,
					ensAvatar,
				});
			}
		} catch (error) {
			console.error("连接钱包失败:", error);
		} finally {
			setIsConnecting(false);
		}
	};

	// 切换网络
	const switchNetwork = async (networkKey: keyof typeof NETWORKS) => {
		if (!window.ethereum) return;

		const network = NETWORKS[networkKey];

		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: network.chainId }],
			});
		} catch (error: any) {
			// 如果网络不存在，则添加网络
			if (error.code === 4902) {
				try {
					await window.ethereum.request({
						method: "wallet_addEthereumChain",
						params: [network],
					});
				} catch (addError) {
					console.error("添加网络失败:", addError);
				}
			} else {
				console.error("切换网络失败:", error);
			}
		}
		setShowNetworkDropdown(false);
	};

	// 监听账户和网络变化
	useEffect(() => {
		if (!isMetaMaskInstalled()) return;

		const handleAccountsChanged = async (accounts: string[]) => {
			if (accounts.length === 0) {
				setWallet({
					address: null,
					chainId: null,
					isConnected: false,
					balance: "0",
					ensName: null,
					ensAvatar: null,
				});
			} else {
				const balance = await getBalance(accounts[0]);
				const { ensName, ensAvatar } = await getENSInfo(accounts[0]);
				setWallet((prev) => ({
					...prev,
					address: accounts[0],
					balance,
					ensName,
					ensAvatar,
				}));
			}
		};

		const handleChainChanged = async (chainId: string) => {
			setWallet((prev) => ({ ...prev, chainId }));
			if (wallet.address) {
				const balance = await getBalance(wallet.address);
				const { ensName, ensAvatar } = await getENSInfo(wallet.address);
				setWallet((prev) => ({
					...prev,
					balance,
					ensName,
					ensAvatar,
				}));
			}
		};

		window.ethereum!.on("accountsChanged", handleAccountsChanged);
		window.ethereum!.on("chainChanged", handleChainChanged);

		// 检查是否已连接
		const checkConnection = async () => {
			try {
				const accounts = await window.ethereum!.request({ method: "eth_accounts" });
				if (accounts.length > 0) {
					const chainId = await window.ethereum!.request({ method: "eth_chainId" });
					const balance = await getBalance(accounts[0]);
					const { ensName, ensAvatar } = await getENSInfo(accounts[0]);
					setWallet({
						address: accounts[0],
						chainId,
						isConnected: true,
						balance,
						ensName,
						ensAvatar,
					});
				}
			} catch (error) {
				console.error("检查连接状态失败:", error);
			}
		};

		checkConnection();

		return () => {
			if (window.ethereum) {
				window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
				window.ethereum.removeListener("chainChanged", handleChainChanged);
			}
		};
	}, [wallet.address]);

	return (
		<div className="relative">
			{!wallet.isConnected ? (
				<button
					onClick={connectWallet}
					disabled={isConnecting}
					className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					<Wallet className="w-4 h-4" />
					{isConnecting ? "连接中..." : "连接钱包"}
				</button>
			) : (
				<div className="flex items-center gap-2">
					{/* 网络显示和切换 */}
					<div className="relative">
						<button
							onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
							className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors border"
						>
							<Globe className="w-4 h-4" />
							<span className="text-sm">{getCurrentNetwork()?.chainName.split(" ")[0] || "未知网络"}</span>
							<ChevronDown className="w-3 h-3" />
						</button>

						{showNetworkDropdown && (
							<div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
								{Object.entries(NETWORKS).map(([key, network]) => (
									<button
										key={key}
										onClick={() => switchNetwork(key as keyof typeof NETWORKS)}
										className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
									>
										<span>{network.chainName}</span>
										{wallet.chainId === network.chainId && <Check className="w-4 h-4 text-green-500" />}
									</button>
								))}
							</div>
						)}
					</div>

					{/* 钱包信息 */}
					<div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border">
						<div className="flex items-center gap-3">
							{/* ENS 头像或默认钱包图标 */}
							<div className="flex-shrink-0">
								{wallet.ensAvatar ? (
									<img
										src={wallet.ensAvatar}
										alt="ENS Avatar"
										className="w-8 h-8 rounded-full object-cover"
										onError={(e) => {
											// 如果头像加载失败，显示默认图标
											(e.currentTarget as HTMLElement).style.display = "none";
											((e.currentTarget as HTMLElement).nextElementSibling as HTMLElement)!.style.display = "flex";
										}}
									/>
								) : null}
								<div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${wallet.ensAvatar ? "hidden" : "flex"}`}>
									<Wallet className="w-4 h-4 text-white" />
								</div>
							</div>

							{/* 钱包信息 */}
							<div className="text-sm min-w-0">
								<div className="font-medium">{wallet.ensName || formatAddress(wallet.address!)}</div>
								{wallet.ensName && <div className="text-xs text-gray-500">{formatAddress(wallet.address!)}</div>}
								<div className="text-xs text-gray-500">
									{formatBalance(wallet.balance)} {getCurrentNetwork()?.nativeCurrency.symbol || "ETH"}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* 点击外部关闭下拉菜单 */}
			{showNetworkDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowNetworkDropdown(false)} />}
		</div>
	);
};
export default WalletComponent;
