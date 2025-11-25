import { axiosInstance } from "@/utils/axiosInstace";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

const getRequest = async (
  endPoint: string,
  options?: AxiosRequestConfig
): Promise<AxiosResponse> => {
  try {
    return new Promise((resolve, reject) => {
      axiosInstance
        .get(endPoint, options ? options : {})
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  } catch (error) {
    throw error;
  }
};

const postRequest = async (
  endPoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse> => {
  try {
    return new Promise((resolve, reject) => {
      axiosInstance
        .post(endPoint, data, config)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  } catch (error) {
    throw error;
  }
};

export const getAllCalendarEvents = () => getRequest(`/api/calendar/events`);

export const processMessage = (message: string) =>
  postRequest(`/api/message/process-message`, { message });
