// services/RestApiServices/apiClient.ts
import axios from "axios";

export const BASE_URL = "https://adfd9ywki5.execute-api.ap-south-1.amazonaws.com/dev";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
  (response) => response,
  (error) => Promise.reject(error.response ? error.response.data : error)
);

export default apiClient;
