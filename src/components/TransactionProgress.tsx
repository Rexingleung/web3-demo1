import React from 'react'

interface TransactionProgressProps {
  status: 'sending' | 'submitted'
  progressPercent: number
  currentConfirmations: number
  targetConfirmations: number
  transactionHash: string
}

export default function TransactionProgress({
  status,
  progressPercent,
  currentConfirmations,
  targetConfirmations,
  transactionHash
}: TransactionProgressProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        交易进度：{progressPercent}%
        {status === 'submitted' ? `（确认数：${currentConfirmations}/${targetConfirmations}）` : ''}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {status === 'submitted' && (
        <div className="text-sm text-gray-800">
          哈希值：<code className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">{transactionHash}</code>
          <br />
          <a 
            href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline ml-1"
          >
            在区块浏览器中查看
          </a>
        </div>
      )}
    </div>
  )
} 