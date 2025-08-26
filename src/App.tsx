import Header from './components/Header';
import Transaction from './components/Transaction';
import GetSepoliaData from './components/GetSepoliaData';
import GetTheGraphData from './components/GetTheGraphData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            欢迎使用 Web3 DApp
          </h2>
          <p className="text-gray-600">
            请连接您的 MetaMask 钱包开始使用
          </p>
        </div>
        
        <Transaction />
        <GetSepoliaData />
        <QueryClientProvider client={queryClient}>
          <GetTheGraphData />
        </QueryClientProvider>
      </main>
    </div>
  );
};

export default App;