import { BrowserRouter, Route, Routes } from "react-router-dom";
import CandidateDetail from "./pages/CandidateDetail";
import CandidateList from "./pages/CandidateList";
import ContractManagement from "./pages/ContractManagement";
import JobDetail from "./pages/jobDetail";
import JobList from "./pages/JobList";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobList />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/contracts" element={<ContractManagement />} />
        <Route path="/candidates" element={<CandidateList />} />
        <Route path="/candidate/:id" element={<CandidateDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
