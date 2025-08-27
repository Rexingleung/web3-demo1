import { create } from 'zustand'
import { BrowserProvider, type Eip1193Provider } from 'ethers'

interface TransactionState {
  // 交易状态
  transactions: Map<string, {
    hash: string
    status: 'pending' | 'confirmed' | 'failed'
    confirmations: number
    targetConfirmations: number
    onConfirmed?: (hash: string) => void
    onFailed?: (hash: string, error: string) => void
  }>
  
  // 区块监听状态
  isListening: boolean
  currentBlockNumber: number
  
  // 方法
  addTransaction: (hash: string, targetConfirmations: number, onConfirmed?: (hash: string) => void, onFailed?: (hash: string, error: string) => void) => void
  removeTransaction: (hash: string) => void
  updateTransactionConfirmations: (hash: string, confirmations: number) => void
  setTransactionStatus: (hash: string, status: 'pending' | 'confirmed' | 'failed') => void
  startBlockListening: () => Promise<void>
  stopBlockListening: () => void
  setCurrentBlockNumber: (blockNumber: number) => void
  checkTransactionManually: (hash: string) => Promise<{ receipt: any; currentBlock: number }>
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: new Map(),
  isListening: false,
  currentBlockNumber: 0,

  addTransaction: (hash, targetConfirmations, onConfirmed, onFailed) => {
    set((state) => {
      const newTransactions = new Map(state.transactions)
      newTransactions.set(hash, {
        hash,
        status: 'pending',
        confirmations: 0,
        targetConfirmations,
        onConfirmed,
        onFailed
      })
      return { transactions: newTransactions }
    })
  },

  removeTransaction: (hash) => {
    set((state) => {
      const newTransactions = new Map(state.transactions)
      newTransactions.delete(hash)
      return { transactions: newTransactions }
    })
  },

  updateTransactionConfirmations: (hash, confirmations) => {
    set((state) => {
      const newTransactions = new Map(state.transactions)
      const transaction = newTransactions.get(hash)
      if (transaction) {
        newTransactions.set(hash, {
          ...transaction,
          confirmations
        })
      }
      return { transactions: newTransactions }
    })
  },

  setTransactionStatus: (hash, status) => {
    set((state) => {
      const newTransactions = new Map(state.transactions)
      const transaction = newTransactions.get(hash)
      if (transaction) {
        newTransactions.set(hash, {
          ...transaction,
          status
        })
      }
      return { transactions: newTransactions }
    })
  },

  startBlockListening: async () => {
    if (get().isListening) return

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not available')
      }

      const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
      
      const onBlock = async (blockNumber: number) => {
        const state = get()
        set({ currentBlockNumber: blockNumber })

        // 检查所有待确认的交易
        for (const [hash, transaction] of state.transactions) {
          if (transaction.status === 'pending') {
            try {
              const receipt = await provider.getTransactionReceipt(hash)
              console.log(`Checking transaction ${hash}:`, { receipt, blockNumber })
              
              if (receipt && receipt.status === 1) { // 确保交易成功
                const confirmations = Math.max(0, blockNumber - (receipt.blockNumber ?? blockNumber) + 1)
                console.log(`Transaction ${hash} confirmations:`, confirmations, `target:`, transaction.targetConfirmations)
                
                get().updateTransactionConfirmations(hash, confirmations)
                
                if (confirmations >= transaction.targetConfirmations) {
                  console.log(`Transaction ${hash} confirmed!`)
                  get().setTransactionStatus(hash, 'confirmed')
                  transaction.onConfirmed?.(hash)
                  
                  // 延迟移除交易记录
                  setTimeout(() => {
                    get().removeTransaction(hash)
                  }, 5000)
                }
              } else if (receipt && receipt.status === 0) {
                // 交易失败
                console.log(`Transaction ${hash} failed!`)
                get().setTransactionStatus(hash, 'failed')
                transaction.onFailed?.(hash, 'Transaction failed on chain')
                
                setTimeout(() => {
                  get().removeTransaction(hash)
                }, 5000)
              }
            } catch (error) {
              console.warn(`Failed to check transaction ${hash}:`, error)
            }
          }
        }
      }

      // 开始监听区块
      provider.on('block', onBlock)
      
      // 获取当前区块号
      const currentBlock = await provider.getBlockNumber()
      set({ 
        isListening: true, 
        currentBlockNumber: currentBlock 
      })

      // 立即检查一次所有交易
      onBlock(currentBlock)

    } catch (error) {
      console.error('Failed to start block listening:', error)
      throw error
    }
  },

  stopBlockListening: () => {
    if (!get().isListening) return

    try {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
        provider.removeAllListeners('block')
      }
    } catch (error) {
      console.warn('Failed to stop block listening:', error)
    }

    set({ isListening: false })
  },

  setCurrentBlockNumber: (blockNumber) => {
    set({ currentBlockNumber: blockNumber })
  },

  // 手动检查交易状态（用于调试和备用）
  checkTransactionManually: async (hash: string) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not available')
      }

      const provider = new BrowserProvider(window.ethereum as Eip1193Provider)
      const receipt = await provider.getTransactionReceipt(hash)
      const currentBlock = await provider.getBlockNumber()
      
      console.log('Manual check for transaction:', hash, { receipt, currentBlock })
      
      if (receipt && receipt.status === 1) {
        const confirmations = Math.max(0, currentBlock - (receipt.blockNumber ?? currentBlock) + 1)
        const state = get()
        const transaction = state.transactions.get(hash)
        
        if (transaction) {
          get().updateTransactionConfirmations(hash, confirmations)
          
          if (confirmations >= transaction.targetConfirmations) {
            get().setTransactionStatus(hash, 'confirmed')
            transaction.onConfirmed?.(hash)
          }
        }
      }
      
      return { receipt, currentBlock }
    } catch (error) {
      console.error('Manual transaction check failed:', error)
      throw error
    }
  }
}))

// 获取交易状态的辅助函数
export const getTransactionStatus = (hash: string) => {
  const state = useTransactionStore.getState()
  return state.transactions.get(hash)
}

// 检查交易是否已确认的辅助函数
export const isTransactionConfirmed = (hash: string) => {
  const transaction = getTransactionStatus(hash)
  return transaction?.status === 'confirmed'
} 