import { useSearchParams } from 'react-router-dom'
import Game from './Game'
import Journey from './Journey'

/** /journey opens the playable journey; /journey?mode=study opens the eight stops in depth. */
export default function JourneyPage() {
  const [params] = useSearchParams()
  return params.get('mode') === 'study' ? <Journey /> : <Game />
}
