import { useCallback, useMemo, useState, useEffect } from 'react'
import { BrowserProvider, parseEther, isAddress, isHexString, type Eip1193Provider } from 'ethers'
import { useWalletStore } from '../stores/walletStore'
import { useTransactionStore } from '../stores/transactionStore'
import { stringToHex } from '../utils/index'
import TransactionProgress from './TransactionProgress'

type TxState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected'; address: string }
  | { status: 'sending' }
  | { status: 'submitted'; hash: string }
  | { status: 'success'; hash: string }
  | { status: 'error'; message: string }

function Transaction() {
  const [txState, setTxState] = useState<TxState>({ status: 'idle' })
  const { address: account, connectWallet, isMetaMaskInstalled, switchNetwork } = useWalletStore()
  const { 
    addTransaction, 
    startBlockListening, 
    stopBlockListening,
    checkTransactionManually,
    transactions,
    currentBlockNumber 
  } = useTransactionStore()
  const [recipient, setRecipient] = useState<string>('')
  const [amountEth, setAmountEth] = useState<string>('')
  const [dataHex, setDataHex] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [currentConfirmations, setCurrentConfirmations] = useState<number>(0)
  const TARGET_CONFIRMATIONS = 2

  // 从全局 store 获取当前交易的确认数
  const currentTransaction = txState.status === 'submitted' 
    ? transactions.get(txState.hash) 
    : null

  // 同步确认数状态
  useEffect(() => {
    if (currentTransaction) {
      setCurrentConfirmations(currentTransaction.confirmations)
      const pct = Math.min(100, Math.floor((currentTransaction.confirmations / TARGET_CONFIRMATIONS) * 100))
      setProgressPercent(pct)
    }
  }, [currentTransaction, TARGET_CONFIRMATIONS])

  // 重置所有状态的函数
  const resetTransaction = useCallback(() => {
    setTxState({ status: 'idle' })
    setRecipient('')
    setAmountEth('')
    setDataHex('')
    setProgressPercent(0)
    setCurrentConfirmations(0)
  }, [])

  // 启动全局区块监听
  useEffect(() => {
    startBlockListening().catch(console.error)
    
    return () => {
      stopBlockListening()
    }
  }, [startBlockListening, stopBlockListening])

  const isMetamaskAvailable = isMetaMaskInstalled()

  const shortAddress = useMemo(() => {
    if (!account) return ''
    return account.slice(0, 6) + '...' + account.slice(-4)
  }, [account])

  // 确保网络连接和配置
  const ensureCorrectNetwork = useCallback(async () => {
    try {
      if (!window.ethereum) throw new Error('无法访问MetaMask')
      
      // 检查当前网络
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      const sepoliaChainId = '0xaa36a7' // Sepolia chain ID
      
      if (currentChainId !== sepoliaChainId) {
        // 尝试切换到Sepolia网络
        try {
          await switchNetwork('sepolia')
        } catch (switchError) {
          console.warn('网络切换失败，使用当前网络:', switchError)
        }
      }
      
      return true
    } catch (err) {
      console.error('网络检查失败:', err)
      return false
    }
  }, [switchNetwork])

  const connect = useCallback(async () => {
    try {
      if (!isMetamaskAvailable) {
        setTxState({ status: 'error', message: '未检测到钱包 (window.ethereum)。' })
        return
      }
      
      setTxState({ status: 'connecting' })
      
      // 先确保网络正确
      await ensureCorrectNetwork()
      
      await connectWallet()
      
      if (!window.ethereum) throw new Error('无法取得账户')
      
      // 使用更稳定的方式获取账户
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      const userAddress = accounts?.[0]
      
      if (!userAddress) throw new Error('无法取得账户')
      
      setTxState({ status: 'connected', address: userAddress })
    } catch (err: unknown) {
      setTxState({ status: 'error', message: getErrorMessage(err) })
    }
  }, [isMetamaskAvailable, connectWallet, ensureCorrectNetwork])

  const sendTx = useCallback(async () => {
    try {
      if (!isMetamaskAvailable) {
        setTxState({ status: 'error', message: '未检测到钱包 (window.ethereum)。' })
        return
      }
      
      if (!isAddress(recipient)) {
        setTxState({ status: 'error', message: '收款地址无效。' })
        return
      }
      
      if (dataHex && !isHexString(dataHex)) {
        setTxState({ status: 'error', message: '数据必须为 0x 开头的十六进制字符串。' })
        return
      }
      
      const value = (() => {
        try {
          return parseEther(amountEth || '0')
        } catch {
          return null
        }
      })()
      
      if (!value || value <= 0n) {
        setTxState({ status: 'error', message: '金额无效，请输入正确的 ETH 数值。' })
        return
      }

      setTxState({ status: 'sending' })
      
      // 确保网络连接正常
      await ensureCorrectNetwork()
      
      // 创建provider时增加错误处理
      let provider: BrowserProvider
      try {
        provider = new BrowserProvider(window.ethereum as Eip1193Provider)
        
        // 测试provider连接
        await provider.getNetwork()
      } catch (providerError) {
        throw new Error('无法连接到区块链网络，请检查网络设置和MetaMask连接状态')
      }
      
      const signer = await provider.getSigner()
      
      // 估算Gas（可选，但有助于提前发现问题）
      const txRequest = dataHex ? { to: recipient, value, data: dataHex } : { to: recipient, value }
      
      try {
        await provider.estimateGas(txRequest)
      } catch (gasError) {
        console.warn('Gas估算失败，继续发送交易:', gasError)
      }
      
      const tx = await signer.sendTransaction(txRequest)
      setTxState({ status: 'submitted', hash: tx.hash })
      setProgressPercent(10)

      // 使用全局交易监测
      addTransaction(tx.hash, TARGET_CONFIRMATIONS, 
        // onConfirmed 回调
        (hash) => {
          console.log('Transaction confirmed callback triggered:', hash)
          setTxState({ status: 'success', hash })
          setProgressPercent(100)
          setCurrentConfirmations(TARGET_CONFIRMATIONS)
          
          // 10秒后自动重置状态
          setTimeout(() => {
            resetTransaction()
          }, 10 * 1000)
        },
        // onFailed 回调
        (hash, error) => {
          console.log('Transaction failed callback triggered:', hash, error)
          setTxState({ status: 'error', message: error })
        }
      )
    } catch (err: unknown) {
      setTxState({ status: 'error', message: getErrorMessage(err) })
    }
  }, [amountEth, recipient, dataHex, isMetamaskAvailable, ensureCorrectNetwork])

  // 切换到Sepolia网络的辅助函数
  const switchToSepolia = useCallback(async () => {
    try {
      await switchNetwork('sepolia')
      setTxState({ status: 'idle' }) // 重置状态
    } catch (err) {
      setTxState({ status: 'error', message: '切换网络失败: ' + getErrorMessage(err) })
    }
  }, [switchNetwork])

  function getErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const message = String((err as { message?: unknown }).message ?? '') || '未知錯誤'
      
      // 针对常见的网络错误提供更友好的提示
      if (message.includes('Failed to fetch')) {
        return '网络连接失败，请检查网络设置和MetaMask状态，或尝试切换RPC节点'
      }
      if (message.includes('User rejected')) {
        return '用户取消了交易'
      }
      if (message.includes('insufficient funds')) {
        return '余额不足'
      }
      
      return message
    }
    return String(err)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">转帐</h2>
          {account ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                已连接
                <span className="font-mono">{shortAddress}</span>
              </span>
              <button
                onClick={switchToSepolia}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
              >
                切换到Sepolia
              </button>
            </div>
          ) : null}
        </div>

        {!account ? (
          <div className="space-y-3">
            <button
              onClick={connect}
              disabled={txState.status === 'connecting'}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {txState.status === 'connecting' ? '连接中...' : '连接钱包'}
            </button>
            <p className="text-xs text-gray-500">
              确保已安装MetaMask并设置为Sepolia测试网络
            </p>
          </div>
        ) : null}

        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm text-gray-600">接收地址</span>
            <input
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-gray-600">金额 (ETH)</span>
            <input
              type="number"
              step="0.001"
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="0.01"
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-gray-600">附加数据 (可选)</span>
            <input
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="输入UTF-8文本，将自动转换为十六进制"
              onChange={(e) => {
                const input = e.target.value;
                if (input) {
                  try {
                    const hexData = stringToHex({ input, addPrefix: true, addSpacing: false, upperCase: false });
                    setDataHex(hexData);
                  } catch (error) {
                    console.error('转换失败:', error);
                    setDataHex('');
                  }
                } else {
                  setDataHex('');
                }
              }}
            />
            <span className="text-sm text-gray-600">转换后的16进制数据为 {dataHex}</span>
          </label>

          <button
            onClick={sendTx}
            disabled={!account || txState.status === 'sending'}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {txState.status === 'sending' ? '发送中...' : '发送交易'}
          </button>
        </div>

        {(txState.status === 'sending' || txState.status === 'submitted') && (
          <TransactionProgress
            status={txState.status}
            progressPercent={progressPercent}
            currentConfirmations={currentConfirmations}
            targetConfirmations={TARGET_CONFIRMATIONS}
            transactionHash={txState.status === 'submitted' ? txState.hash : ''}
          />
        )}

        {/* 显示当前区块号和交易状态（调试用） */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>当前区块号: {currentBlockNumber}</div>
          <div>监测中的交易数: {transactions.size}</div>
          {txState.status === 'submitted' && (
            <div className="space-y-1">
              <div>当前交易确认数: {currentConfirmations}/{TARGET_CONFIRMATIONS}</div>
              <button
                onClick={() => {
                  if (txState.status === 'submitted') {
                    checkTransactionManually(txState.hash).catch(console.error)
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                手动检查交易状态
              </button>
            </div>
          )}
        </div>

        {txState.status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm space-y-2">
            <div>错误：{txState.message}</div>
            {txState.message.includes('网络连接失败') && (
              <div className="text-xs text-red-600">
                建议：
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>检查网络连接</li>
                  <li>尝试刷新页面</li>
                  <li>在MetaMask中手动切换到Sepolia网络</li>
                  <li>检查MetaMask的RPC设置</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {txState.status === 'success' && (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm space-y-2">
            <div>
              成功！交易哈希值：
              <code className="ml-1 px-1.5 py-0.5 rounded bg-white/60 border border-green-200">{txState.hash}</code>
            </div>
            <div className="flex items-center justify-between">
              <a 
                href={`https://sepolia.etherscan.io/tx/${txState.hash}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 underline text-xs"
              >
                在Sepolia浏览器中查看交易详情
              </a>
              <button
                onClick={resetTransaction}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 transition-colors"
              >
                发送新交易
              </button>
            </div>
            <div className="text-xs text-green-600">
              10秒后自动重置表单...
            </div>
          </div>
        )}

        {!isMetamaskAvailable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
            未检测到浏览器钱包。请安装 MetaMask 后刷新。
          </div>
        )}
      </div>
    </div>
  )
}

export default Transaction