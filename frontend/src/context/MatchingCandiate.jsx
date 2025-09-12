// context/MatchingCandiateContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import API from "./api/api";
import axiosClient from "./api/axiosClient";

const MatchingCandidateContext = createContext();

export const MatchingCandidateProvider = ({ children }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatchingCandidate = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(API.MATCHING_CANDIATE.LIST);
      setCandidates(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchingCandidate();
  }, []);

  return (
    <MatchingCandidateContext.Provider
      value={{ candidates, loading, error, fetchMatchingCandidate }}
    >
      {children}
    </MatchingCandidateContext.Provider>
  );
};

export const useMatchingCandidate = () => useContext(MatchingCandidateContext);
