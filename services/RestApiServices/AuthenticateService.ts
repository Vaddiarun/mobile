import apiClient from "../apiClient";
import {EndPoints} from "../endPoints";


export const registerUser = async (body: any) => {
  try {
    const response = await apiClient.post(EndPoints.REGISTER, body);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || error };
  }
};

export const verifyOtp = async (body: any) => {
  try {
    const response = await apiClient.post(EndPoints.OTP_VERIFY, body);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error };
  }
};

export const deleteUser = async (body: any) => {
  try {
    const response = await apiClient.delete(EndPoints.DELETE_USER, { data: body });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message || error };
  }
};