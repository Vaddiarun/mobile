import apiClient from "../apiClient";
import { EndPoints } from "../endPoints";
import { getUser, saveData, getData } from "../../mmkv-storage/storage";

export const getTripHistory = async (from: string, to: string, page: number = 1, limit: number = 5) => {
  try {
    const cacheKey = `trip_history_${from}_${to}_${page}_${limit}`;
    const cached = getData(cacheKey);
    if (cached) return { success: true, data: cached };

    const user = getUser();
    const token = user?.data?.token;

    if (!token) {
      return { success: false, error: "No authentication token found" };
    }

    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get(`${EndPoints.GET_TRIP_HISTORY}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    saveData(cacheKey, response.data?.data);
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message || error };
  }
};

export const getHomeStatus = async (from: number = 0, to: number = 0) => {
  try {
    const user = getUser();
    const token = user?.data?.token;

    if (!token) {
      return { success: false, error: "No authentication token found" };
    }

    const response = await apiClient.get(`${EndPoints.GET_HOME_STATUS}?from=${from}&to=${to}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { success: true, data: response.data?.message };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message || error };
  }
};

export const getTripDetails = async (tripName: string) => {
  try {
    const cacheKey = `trip_details_${tripName}`;
    const cached = getData(cacheKey);
    if (cached) return { success: true, data: cached };

    const user = getUser();
    const token = user?.data?.token;

    if (!token) {
      return { success: false, error: "No authentication token found" };
    }

    const response = await apiClient.get(`${EndPoints.GET_TRIP_DETAILS}?tripName=${tripName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    saveData(cacheKey, response.data?.data);
    return { success: true, data: response.data?.data };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message || error };
  }
};
