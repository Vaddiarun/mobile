import apiClient from "../apiClient";
import { EndPoints } from "../endPoints";
import { getUser } from "../../mmkv-storage/storage";

export const getTripHistory = async (from: string, to: string, page: number = 1, limit: number = 5) => {
  try {
    const user = getUser();
    const token = user?.data?.token;

    if (!token) {
      return { success: false, error: "No authentication token found" };
    }

    const response = await apiClient.get(EndPoints.GET_TRIP_HISTORY, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { success: true, data: response.data?.data };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message || error };
  }
};
