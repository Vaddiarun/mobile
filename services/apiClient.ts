// services/RestApiServices/apiClient.ts
import axios from "axios";
import { globalShowNetworkError } from '../components/NetworkErrorContext';

export const BASE_URL = "https://adfd9ywki5.execute-api.ap-south-1.amazonaws.com/dev";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let networkErrorShown = false;

// ✅ Request interceptor (optional, e.g. add auth token later)
apiClient.interceptors.request.use(
  async (config) => {
    // Example: attach token if available
    // const token = await AsyncStorage.getItem("token");
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor (optional)
apiClient.interceptors.response.use(
  (response) => {
    networkErrorShown = false;
    return response;
  },
  (error) => {
    if (!networkErrorShown && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response)) {
      networkErrorShown = true;
      if (globalShowNetworkError) {
        globalShowNetworkError();
      }
      setTimeout(() => { networkErrorShown = false; }, 3000);
    }
    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default apiClient;
