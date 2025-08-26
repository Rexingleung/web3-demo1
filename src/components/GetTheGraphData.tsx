
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
const query = gql`{
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
const headers = { Authorization: 'Bearer 0fe3e11ad36f57a2476dc1d49a9dffdc' }
export default function GetTheGraphData() {
  const { data, status } = useQuery({
    queryKey: ['data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })
	console.log(data, 'data');
	console.log(status, 'status');
	
  return (
		<main>
			{status === 'pending' ? <div>Loading...</div> : null}
			{status === 'error' ? <div>Error ocurred querying the Subgraph</div> : null}
			<div>{JSON.stringify(data ?? {})}</div>
		</main>
  )
}