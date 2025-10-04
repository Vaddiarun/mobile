import apiClient from "../apiClient";
import {EndPoints} from "../endPoints";


export const getCustomerBoxProfiles = async (email: string) => {
  try {
    const response = await apiClient.get(`${EndPoints.GET_CUSTOMER_BOX_PROFILES}?creator=${email}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || error };
  }
};