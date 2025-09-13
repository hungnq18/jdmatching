import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/jd');
      // Xử lý nhiều cấu trúc response khác nhau
      const jds = res.data.data?.jds || res.data.data || res.data.jds || [];
      setJobs(Array.isArray(jds) ? jds : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addJob = async (job) => {
    try {
      const res = await api.post('/jd', job);
      setJobs((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteJob = async (id) => {
    try {
      await api.delete(`/jd/${id}`);
      setJobs((prev) => prev.filter(job => job._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <JobContext.Provider value={{ jobs, loading, error, addJob, fetchJobs, deleteJob }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => useContext(JobContext);
