import { createContext, useContext, useState } from "react";
import api from "../utils/api";

const MatchingCandidateContext = createContext();

export const MatchingCandidateProvider = ({ children }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatchingCandidate = async (jdId) => {
    if (!jdId) {
      setError('JD ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/jd/${jdId}/candidates`);
      setCandidates(res.data.data.candidates || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching matching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearCandidates = () => {
    setCandidates([]);
    setError(null);
  };

  return (
    <MatchingCandidateContext.Provider
      value={{ 
        candidates, 
        loading, 
        error, 
        fetchMatchingCandidate,
        clearCandidates 
      }}
    >
      {children}
    </MatchingCandidateContext.Provider>
  );
};

export const useMatchingCandidate = () => {
  const context = useContext(MatchingCandidateContext);
  if (!context) {
    throw new Error('useMatchingCandidate must be used within MatchingCandidateProvider');
  }
  return context;
};
