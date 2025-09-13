import { BrowserRouter, Route, Routes } from "react-router-dom";
import JobDetail from "./pages/jobDetail";
import JobList from "./pages/JobList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobList />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="*" element={<JobList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
