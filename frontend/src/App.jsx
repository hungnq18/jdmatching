import { BrowserRouter, Route, Routes } from "react-router-dom";
import JobDetail from "./pages/JobDetail";
import JobList from "./pages/JobList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
