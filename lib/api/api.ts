import apiClient from './api-client';

// Helper function for POST requests with array bodies
// This is needed because our apiClient.post expects a Record<string, unknown> type
async function postArrayBody<T>(url: string, arrayData: string[]): Promise<T> {
  const session = await import('next-auth/react').then(mod => mod.getSession());
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // @ts-expect-error - Custom property added by our callback
  if (session?.backendAccessToken) {
    // @ts-expect-error - Custom property added by our callback
    headers["Authorization"] = `Bearer ${session.backendAccessToken}`;
  }
  
  const response = await fetch(`https://tmhire-backend.onrender.com${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(arrayData),
    mode: "cors",
    credentials: "include",
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}): ${errorText}`);
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  return response.json();
}

// Type definitions
export interface TransitMixer {
  _id: string;
  user_id: string;
  identifier: string;
  capacity: number;
  created_at: string;
}

export interface Schedule {
  _id: string;
  user_id: string;
  client_name: string;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
  };
  output_table: OutputTableRow[];
  tm_count: number | null;
  pumping_time: number | null;
  status: string;
}

export interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
}

interface ScheduleOutput {
  _id: string;
  user_id: string;
  client_name: string;
  created_at: string;
  last_updated: string;
  input_params: InputParams;
  output_table: OutputTableRow[];
  tm_count: number;
  pumping_time: string | null;
  status: string;
}


interface InputParams {
  quantity: number;
  pumping_speed: number;
  onward_time: number;
  return_time: number;
  buffer_time: number;
}
// Transit Mixer API
export const tmApi = {
  getAllTMs: async () => {
    return apiClient.get<TransitMixer[]>('/tms');
  },
  
  getTM: async (id: string) => {
    return apiClient.get<TransitMixer>(`/tms/${id}`);
  },
  
  createTM: async (data: { identifier: string; capacity: number }) => {
    return apiClient.post<TransitMixer, typeof data>('/tms', data);
  },
  
  updateTM: async (id: string, data: { identifier: string; capacity: number }) => {
    return apiClient.put<TransitMixer, typeof data>(`/tms/${id}`, data);
  },
  
  deleteTM: async (id: string) => {
    return apiClient.delete<{ success: boolean }>(`/tms/${id}`);
  },
  
  getAverageCapacity: async () => {
    return apiClient.get<{ average_capacity: number }>('/tms/average-capacity');
  },
};

// Schedule API
export const scheduleApi = {
  getSchedules: async () => {
    return apiClient.get<Schedule[]>("/schedules");
  },

  getSchedule: async (id: string) => {
    return apiClient.get<Schedule>(`/schedules/${id}`);
  },

  deleteSchedule: async (id: string) => {
    return apiClient.delete<{ success: boolean }>(`/schedules/${id}`);
  },

  // Step 1: Calculate TMs and create draft schedule
  calculateTMs: async (data: {
    client_name?: string;
    input_params: {
      quantity: number;
      pumping_speed: number;
      onward_time: number;
      return_time: number;
      buffer_time: number;
    };
  }) => {
    return apiClient.post<{ schedule_id: string; tm_count: number }, typeof data>(
      "/schedules/calculate-tm",
      data
    );
  },  

  // Get all available TMs to select from
  getAvailableTMs: async () => {
    return apiClient.get<TransitMixer[]>("/tms");
  },

  // Step 2: Generate schedule with selected TMs
  generateSchedule: async ({
    scheduleId,
    selected_tm_ids
  }: {
    scheduleId: string;
    selected_tm_ids: string[];
  }) => {
    // The API expects a direct array of strings as the body
    // Use our custom helper function that can handle array bodies
    return postArrayBody<ScheduleOutput[]>(
      `/schedules/${scheduleId}/generate-schedule`,
      selected_tm_ids
    );
  } 
};
