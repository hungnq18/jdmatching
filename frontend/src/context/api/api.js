// api.js

const BASE_URL = import.meta.env.VITE_BASE_URL;

const API = {
  JOBS: {
    LIST: `${BASE_URL}/jd`,
    DETAIL: (id) => `${BASE_URL}/jd/${id}`,
  },
  USERS: {
    LIST: `${BASE_URL}/users`,
    DETAIL: (id) => `${BASE_URL}/users/${id}`,
  },
  CANDIDATES: {
    LIST: (jobId) => `${BASE_URL}/match/${jobId}`,
  },
};

export default API;
