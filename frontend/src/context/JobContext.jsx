import { createContext, useContext, useEffect, useState } from "react";
import API from "./api/api";
import axiosClient from "./api/axiosClient";

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(API.JOBS.LIST);
      setJobs(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addJob = async (job) => {
    try {
      const res = await axiosClient.post(API.JOBS.LIST, job);
      setJobs((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <JobContext.Provider value={{ jobs, loading, error, addJob, fetchJobs }}>
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => useContext(JobContext);
