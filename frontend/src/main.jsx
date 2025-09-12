import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { JobProvider } from './context/JobContext.jsx'
import { MatchingCandidateProvider } from './context/MatchingCandiate.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <MatchingCandidateProvider>
    <JobProvider>
    <App />
  </JobProvider>
  </MatchingCandidateProvider>
  
)
