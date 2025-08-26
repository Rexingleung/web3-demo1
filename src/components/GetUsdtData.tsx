import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

const query = `{
  issues(first: 5) {
    id
    amount
    blockNumber
    blockTimestamp
  }
  redeems(first: 5) {
    id
    amount
    blockNumber
    blockTimestamp
  }
}`

const url = 'https://api.studio.thegraph.com/query/119307/get-usdt-info/version/latest'

export default function GetUsdtData() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data, status, error, refetch } = useQuery({
    queryKey: ['usdt-data'],
    queryFn: async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 0fe3e11ad36f57a2476dc1d49a9dffdc'
        },
        body: JSON.stringify({
          query: query,
          variables: {}
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`)
      }

      return result.data
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000, // 10分钟
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  console.log(data, 'usdt data')
  console.log(status, 'usdt status')
  console.log(error, 'usdt error')
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">USDT 转账信息</h2>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://thegraph.com/studio/subgraph/119307/get-usdt-info" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              在 The Graph Studio 中查看
            </a>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing || status === 'pending'}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isRefreshing || status === 'pending' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRefreshing ? '刷新中...' : '加载中...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* 只在初始加载时显示loading，刷新时保持数据 */}
        {status === 'pending' && !data && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-600">正在加载USDT数据...</div>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">查询USDT数据时发生错误</h3>
                <div className="mt-1 text-sm text-red-700">
                  {error instanceof Error ? error.message : String(error)}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {status === 'success' && data && (
          <div className="space-y-6">
            {/* 刷新状态指示器 */}
            {isRefreshing && (
              <div className="flex items-center justify-center py-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">正在刷新USDT数据...</span>
                </div>
              </div>
            )}

            {/* Issues (发行) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-md font-semibold text-gray-800">USDT 发行记录</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {data.issues?.length || 0} 条记录
                </span>
              </div>
              
              {data.issues && data.issues.length > 0 ? (
                <div className="grid gap-3">
                  {data.issues.map((issue: any, index: number) => (
                    <div key={issue.id} className="group relative rounded-xl border border-gray-200 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 hover:shadow-md">
                      <div className="absolute top-3 right-3 text-xs text-gray-400 font-mono">
                        #{index + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">交易ID</span>
                          <div className="font-mono text-gray-900 break-all mt-1 text-sm">{issue.id}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">区块号</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">{issue.blockNumber}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">发行数量</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm font-medium">
                            {(parseInt(issue.amount) / 1e6).toFixed(2)} USDT
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">时间戳</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">
                            {new Date(parseInt(issue.blockTimestamp) * 1000).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <div className="text-sm">暂无 USDT 发行记录</div>
                </div>
              )}
            </div>

            {/* Redeems (赎回) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h3 className="text-md font-semibold text-gray-800">USDT 赎回记录</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {data.redeems?.length || 0} 条记录
                </span>
              </div>
              
              {data.redeems && data.redeems.length > 0 ? (
                <div className="grid gap-3">
                  {data.redeems.map((redeem: any, index: number) => (
                    <div key={redeem.id} className="group relative rounded-xl border border-gray-200 p-4 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-all duration-200 hover:shadow-md">
                      <div className="absolute top-3 right-3 text-xs text-gray-400 font-mono">
                        #{index + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">交易ID</span>
                          <div className="font-mono text-gray-900 break-all mt-1 text-sm">{redeem.id}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">区块号</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">{redeem.blockNumber}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">赎回数量</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm font-medium">
                            {(parseInt(redeem.amount) / 1e6).toFixed(2)} USDT
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">时间戳</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">
                            {new Date(parseInt(redeem.blockTimestamp) * 1000).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <div className="text-sm">暂无 USDT 赎回记录</div>
                </div>
              )}
            </div>

            {/* 数据统计 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{data.issues?.length || 0}</div>
                <div className="text-sm text-green-600">发行记录</div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{data.redeems?.length || 0}</div>
                <div className="text-sm text-red-600">赎回记录</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}