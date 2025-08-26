import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

const query = `{
  greetingEvents(first: 5) {
    id
    from
    greeting
    timestamp
  }
  helloEvents(first: 5) {
    id
    sender
    message
    timestamp
  }
}`

const url = 'https://api.studio.thegraph.com/query/119307/hello-contract/v0.0.10'

export default function GetTheGraphData() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data, status, error, refetch } = useQuery({
    queryKey: ['thegraph-data'],
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

  console.log(data, 'data')
  console.log(status, 'status')
  console.log(error, 'error')
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">The Graph 子图数据</h2>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://thegraph.com/studio/subgraph/119307/hello-contract" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              在 The Graph Studio 中查看
            </a>
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing || status === 'pending'}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
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
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-600">正在加载子图数据...</div>
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
                <h3 className="text-sm font-medium text-red-800">查询子图时发生错误</h3>
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
              <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">正在刷新数据...</span>
                </div>
              </div>
            )}

            {/* Greeting Events */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-md font-semibold text-gray-800">Greeting Events</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {data.greetingEvents?.length || 0} 条记录
                </span>
              </div>
              
              {data.greetingEvents && data.greetingEvents.length > 0 ? (
                <div className="grid gap-3">
                  {data.greetingEvents.map((event: any, index: number) => (
                    <div key={event.id} className="group relative rounded-xl border border-gray-200 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 hover:shadow-md">
                      <div className="absolute top-3 right-3 text-xs text-gray-400 font-mono">
                        #{index + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">发送者</span>
                          <div className="font-mono text-gray-900 break-all mt-1 text-sm">{event.from}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">时间戳</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">
                            {new Date(parseInt(event.timestamp) * 1000).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 text-xs uppercase tracking-wide">问候语</span>
                          <div className="text-gray-900 mt-1 font-medium">{event.greeting}</div>
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
                  <div className="text-sm">暂无 Greeting Events</div>
                </div>
              )}
            </div>

            {/* Hello Events */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-md font-semibold text-gray-800">Hello Events</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {data.helloEvents?.length || 0} 条记录
                </span>
              </div>
              
              {data.helloEvents && data.helloEvents.length > 0 ? (
                <div className="grid gap-3">
                  {data.helloEvents.map((event: any, index: number) => (
                    <div key={event.id} className="group relative rounded-xl border border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 hover:shadow-md">
                      <div className="absolute top-3 right-3 text-xs text-gray-400 font-mono">
                        #{index + 1}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">发送者</span>
                          <div className="font-mono text-gray-900 break-all mt-1 text-sm">{event.sender}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide">时间戳</span>
                          <div className="font-mono text-gray-900 mt-1 text-sm">
                            {new Date(parseInt(event.timestamp) * 1000).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-500 text-xs uppercase tracking-wide">消息</span>
                          <div className="text-gray-900 mt-1 font-medium">{event.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <div className="text-sm">暂无 Hello Events</div>
                </div>
              )}
            </div>

            {/* 数据统计 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{data.greetingEvents?.length || 0}</div>
                <div className="text-sm text-green-600">Greeting Events</div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{data.helloEvents?.length || 0}</div>
                <div className="text-sm text-blue-600">Hello Events</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}