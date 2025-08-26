import { useCallback, useMemo, useState } from "react";
import { JsonRpcProvider, BrowserProvider, formatEther, Interface } from "ethers";
import { useWalletStore, NETWORKS } from "../stores/walletStore";

const SEPOLIA_RPC = NETWORKS.sepolia.rpcUrls[0] || "https://rpc.sepolia.org/";

const ERC20_IFACE = new Interface([
	"function transfer(address to, uint256 value)",
	"function transferFrom(address from, address to, uint256 value)",
]);

const GetSepoliaData = () => {
	// 选用只读 Provider（无需弹窗）
	const provider = useMemo(() => new JsonRpcProvider(SEPOLIA_RPC), []);

	// 基础链上数据
	const [chainId, setChainId] = useState<string>("");
	const [blockNumber, setBlockNumber] = useState<number>();
	const [gasPrice, setGasPrice] = useState<string>("");
	const [loadingBasics, setLoadingBasics] = useState(false);

	// 余额查询
	const [addr, setAddr] = useState("");
	const [balance, setBalance] = useState<string>("");
	const [loadingBal, setLoadingBal] = useState(false);

	// 交易查询
	const [txHash, setTxHash] = useState("");
	const [txLoading, setTxLoading] = useState(false);
	const [txError, setTxError] = useState<string>("");
	const [txInfo, setTxInfo] = useState<{
		from?: string;
		to?: string | null;
		value?: string;
		nonce?: number;
		gasLimit?: string;
		maxFeePerGas?: string;
		maxPriorityFeePerGas?: string;
		data?: string;
		status?: string;
		blockNumber?: number | null;
		logs?: number;
		decoded?: { method: string; args: Record<string, string> } | null;
	} | null>(null);

	const isValidTxHash = (hash: string) => /^0x([a-fA-F0-9]{64})$/.test(hash);

	const loadBasics = useCallback(async () => {
		try {
			setLoadingBasics(true);
			const [net, bn, fee] = await Promise.all([
				provider.getNetwork(),
				provider.getBlockNumber(),
				provider.getFeeData(),
			]);
			setChainId(`0x${Number(net.chainId).toString(16)}`);
			setBlockNumber(bn);
			const gp = fee.gasPrice;
			setGasPrice(gp ? `${formatEther(gp)} ETH` : "- (EIP-1559)");
		} catch (e) {
			console.error("加载基础信息失败", e);
		} finally {
			setLoadingBasics(false);
		}
	}, [provider]);

	const fetchBalance = useCallback(async () => {
		if (!addr) return;
		try {
			setLoadingBal(true);
			const v = await provider.getBalance(addr);
			setBalance(formatEther(v));
		} catch (e) {
			console.error("获取余额失败", e);
			setBalance("");
		} finally {
			setLoadingBal(false);
		}
	}, [addr, provider]);

	const tryDecodeERC20 = (data: string) => {
		try {
			if (!data || data === "0x") return null;
			// 只尝试常见 transfer/transferFrom
			if (data.startsWith("0xa9059cbb")) {
				const [to, value] = ERC20_IFACE.decodeFunctionData("transfer", data);
				return { method: "transfer", args: { to, value: value.toString() } };
			}
			if (data.startsWith("0x23b872dd")) {
				const [from, to, value] = ERC20_IFACE.decodeFunctionData("transferFrom", data);
				return { method: "transferFrom", args: { from, to, value: value.toString() } };
			}
			return null;
		} catch (e) {
			return null;
		}
	};

	const fetchTx = useCallback(async () => {
		const input = txHash.trim();
		if (!input) return;
		if (!isValidTxHash(input)) {
			setTxError("请输入有效的交易哈希（0x + 64位十六进制字符串），当前看起来像是地址或格式不正确。");
			setTxInfo(null);
			return;
		}
		try {
			setTxLoading(true);
			setTxError("");
			setTxInfo(null);

			const tx = await provider.getTransaction(input);
			if (!tx) {
				setTxError("未查询到该交易");
				return;
			}
			const receipt = await provider.getTransactionReceipt(input).catch(() => null);

			const decodedRaw = tryDecodeERC20(tx.data);
			const decoded = decodedRaw
				? { method: decodedRaw.method, args: Object.fromEntries(Object.entries(decodedRaw.args).map(([k, v]) => [k, String(v ?? '')])) }
				: null;
			setTxInfo({
				from: tx.from,
				to: tx.to,
				value: formatEther(tx.value || 0n),
				nonce: tx.nonce,
				gasLimit: tx.gasLimit ? tx.gasLimit.toString() : undefined,
				maxFeePerGas: tx.maxFeePerGas ? formatEther(tx.maxFeePerGas) : undefined,
				maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? formatEther(tx.maxPriorityFeePerGas) : undefined,
				data: tx.data,
				status: receipt ? (receipt.status === 1 ? "success" : "failed") : "pending",
				blockNumber: receipt?.blockNumber ?? tx.blockNumber ?? null,
				logs: receipt?.logs?.length ?? 0,
				decoded: decoded,
			});
		} catch (e: any) {
			const rpcCode = e?.error?.code ?? e?.code;
			if (rpcCode === -32602) {
				setTxError("RPC 返回 invalid params：请确认输入为交易哈希（0x + 64位十六进制），而不是地址。");
			} else {
				setTxError(e?.message || "查询失败");
			}
		} finally {
			setTxLoading(false);
		}
	}, [txHash, provider]);

	// 可选：使用连接中的浏览器 Provider 发起签名（比如以后扩展）
	const ensureBrowserProvider = useCallback(async () => {
		if (!window.ethereum) return null;
		return new BrowserProvider(window.ethereum);
	}, []);

	return (
		<div className="max-w-3xl mx-auto p-6">
			<div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-8">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900">Sepolia 链上数据查询</h2>
					<a className="text-xs text-blue-600 hover:underline" href="https://sepolia.etherscan.io/" target="_blank" rel="noreferrer">Etherscan</a>
				</div>

				{/* 基础信息 */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-600">基础链上数据</span>
						<button onClick={loadBasics} disabled={loadingBasics} className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white disabled:bg-gray-400">{loadingBasics ? "加载中..." : "刷新"}</button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
						<div className="rounded-lg border border-gray-200 p-3">
							<div className="text-gray-500">Chain ID</div>
							<div className="font-mono text-gray-900">{chainId || "-"}</div>
						</div>
						<div className="rounded-lg border border-gray-200 p-3">
							<div className="text-gray-500">最新区块</div>
							<div className="font-mono text-gray-900">{blockNumber ?? "-"}</div>
						</div>
						<div className="rounded-lg border border-gray-200 p-3">
							<div className="text-gray-500">Gas Price</div>
							<div className="font-mono text-gray-900">{gasPrice || "-"}</div>
						</div>
					</div>
				</div>

				{/* 余额查询 */}
				<div className="space-y-3">
					<div className="text-sm text-gray-600">地址余额</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x 接收地址" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
						<button onClick={fetchBalance} disabled={!addr || loadingBal} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:bg-blue-400">{loadingBal ? "查询中..." : "查询余额"}</button>
					</div>
					{balance && (
						<div className="text-sm text-gray-800">余额：<span className="font-mono">{balance}</span> ETH</div>
					)}
				</div>

				{/* 交易查询 */}
				<div className="space-y-3">
					<div className="text-sm text-gray-600">交易详情（包含 data 十六进制）</div>
					<div className="flex flex-col sm:flex-row gap-3">
						<input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x 交易哈希（64位十六进制）" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
						<button onClick={fetchTx} disabled={!txHash || txLoading} className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:bg-indigo-400">{txLoading ? "查询中..." : "查询交易"}</button>
					</div>
					{txError && <div className="text-sm text-red-600">{txError}</div>}
					{txInfo && (
						<div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
								<div><span className="text-gray-500">From</span><div className="font-mono break-all">{txInfo.from}</div></div>
								<div><span className="text-gray-500">To</span><div className="font-mono break-all">{txInfo.to || "合约"}</div></div>
								<div><span className="text-gray-500">Value</span><div className="font-mono">{txInfo.value} ETH</div></div>
								<div><span className="text-gray-500">Nonce</span><div className="font-mono">{txInfo.nonce}</div></div>
								<div><span className="text-gray-500">Gas Limit</span><div className="font-mono">{txInfo.gasLimit || "-"}</div></div>
								<div><span className="text-gray-500">Max Fee</span><div className="font-mono">{txInfo.maxFeePerGas || "-"}</div></div>
								<div><span className="text-gray-500">Priority Fee</span><div className="font-mono">{txInfo.maxPriorityFeePerGas || "-"}</div></div>
								<div><span className="text-gray-500">Status</span><div className="font-mono">{txInfo.status}</div></div>
								<div><span className="text-gray-500">Block</span><div className="font-mono">{txInfo.blockNumber ?? "-"}</div></div>
								<div><span className="text-gray-500">Logs</span><div className="font-mono">{txInfo.logs}</div></div>
							</div>

							<div className="space-y-1">
								<div className="text-gray-500 text-sm">Data (Hex)</div>
								<pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
{txInfo.data}
								</pre>
							</div>

							{txInfo.decoded && (
								<div className="space-y-1">
									<div className="text-gray-500 text-sm">解析</div>
									<div className="text-sm">
										<span className="font-medium">{txInfo.decoded.method}</span>{" "}
										<code className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs">
											{JSON.stringify(txInfo.decoded.args)}
										</code>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default GetSepoliaData;