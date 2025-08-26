import { useCallback, useMemo, useState } from 'react'
import { BrowserProvider, parseEther, isAddress, isHexString, type Eip1193Provider } from 'ethers'
import { useWalletStore } from '../stores/walletStore'

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
  const { address: account, connectWallet, isMetaMaskInstalled } = useWalletStore()
  const [recipient, setRecipient] = useState<string>('')
  const [amountEth, setAmountEth] = useState<string>('')
  const [dataHex, setDataHex] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [currentConfirmations, setCurrentConfirmations] = useState<number>(0)
  const TARGET_CONFIRMATIONS = 2

  const isMetamaskAvailable = isMetaMaskInstalled()

  const shortAddress = useMemo(() => {
    if (!account) return ''
    return account.slice(0, 6) + '...' + account.slice(-4)
  }, [account])

  const connect = useCallback(async () => {
    try {
      if (!isMetamaskAvailable) {
        setTxState({ status: 'error', message: '未检测到钱包 (window.ethereum)。' })
        return
      }
      setTxState({ status: 'connecting' })
      await connectWallet()
      if (!window.ethereum) throw new Error('無法取得帳戶')
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
      const accounts = (await provider.send('eth_accounts', [])) as string[]
      const userAddress = accounts?.[0]
      if (!userAddress) throw new Error('無法取得帳戶')
      setTxState({ status: 'connected', address: userAddress })
    } catch (err: unknown) {
      setTxState({ status: 'error', message: getErrorMessage(err) })
    }
  }, [isMetamaskAvailable, connectWallet])

  const sendTx = useCallback(async () => {
    try {
      if (!isMetamaskAvailable) {
        setTxState({ status: 'error', message: '未偵測到錢包 (window.ethereum)。' })
        return
      }
      if (!isAddress(recipient)) {
        setTxState({ status: 'error', message: '收款地址無效。' })
        return
      }
      if (dataHex && !isHexString(dataHex)) {
        setTxState({ status: 'error', message: '資料必須為 0x 開頭的十六進制字串。' })
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
        setTxState({ status: 'error', message: '金額無效，請輸入正確 ETH 數值。' })
        return
      }

      setTxState({ status: 'sending' })
      const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
      const signer = await provider.getSigner()
      const txRequest = dataHex ? { to: recipient, value, data: dataHex } : { to: recipient, value }
      const tx = await signer.sendTransaction(txRequest)
      setTxState({ status: 'submitted', hash: tx.hash })
      setProgressPercent(10)

      const trackConfirmations = async () => {
        try {
          // 監聽區塊並更新確認數
          const onBlock = async (newBlockNumber: number) => {
            try {
              const receipt = await provider.getTransactionReceipt(tx.hash)
              if (!receipt) {
                setProgressPercent((p) => (p < 40 ? 40 : p))
                return
              }
              const confirmations = Math.max(0, newBlockNumber - (receipt.blockNumber ?? newBlockNumber) + 1)
              setCurrentConfirmations(confirmations)
              const pct = Math.min(100, Math.floor((confirmations / TARGET_CONFIRMATIONS) * 100))
              setProgressPercent(pct)
              if (confirmations >= TARGET_CONFIRMATIONS) {
                setTxState({ status: 'success', hash: receipt.hash })
                provider.removeListener('block', onBlock)
              }
            } catch {
              // 忽略暫時性錯誤
            }
          }
          provider.on('block', onBlock)
          // provider.waitForTransaction
        } catch {
          // 若監聽失敗，退回等待一次
          try {
            const receipt = await tx.wait()
            setTxState({ status: 'success', hash: receipt?.hash ?? tx.hash })
            setProgressPercent(100)
          } catch (err) {
            setTxState({ status: 'error', message: getErrorMessage(err) })
          }
        }
      }

      void trackConfirmations()
    } catch (err: unknown) {
      setTxState({ status: 'error', message: getErrorMessage(err) })
    }
  }, [amountEth, recipient, dataHex, isMetamaskAvailable])

  function getErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message?: unknown }).message ?? '') || '未知錯誤'
    }
    return String(err)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">ETH 转帐</h2>
          {account ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              已连接
              <span className="font-mono">{shortAddress}</span>
            </span>
          ) : null}
        </div>

        {!account ? (
          <button
            onClick={connect}
            disabled={txState.status === 'connecting'}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {txState.status === 'connecting' ? '连接中...' : '连接钱包'}
          </button>
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
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="0.01"
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-gray-600">数据 (Hex，可选)</span>
            <input
              className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="0x..."
              value={dataHex}
              onChange={(e) => setDataHex(e.target.value)}
            />
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
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              交易进度：{progressPercent}%
              {txState.status === 'submitted' ? `（确认数：${currentConfirmations}/${TARGET_CONFIRMATIONS}）` : ''}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {txState.status === 'submitted' && (
              <div className="text-sm text-gray-800">
                哈希值：<code className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">{txState.hash}</code>
              </div>
            )}
          </div>
        )}

        {txState.status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            错误：{txState.message}
          </div>
        )}

        {txState.status === 'success' && (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">
            成功！交易哈希值：
            <code className="ml-1 px-1.5 py-0.5 rounded bg-white/60 border border-green-200">{txState.hash}</code>
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



