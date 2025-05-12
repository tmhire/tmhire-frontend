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
  
  const response = await fetch(`http://127.0.0.1:8000${url}`, {
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

// Standard response interface for all API responses
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Type definitions
export interface TransitMixer {
  _id: string;
  user_id: string;
  identifier: string;
  capacity: number;
  plant_id?: string; // Updated to include plant_id
  created_at: string;
}

export interface Plant {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
}

export interface Client {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  notes?: string;
  created_at: string;
}

export interface Schedule {
  _id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  site_location: string;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    pump_start: string; // New field
    schedule_date: string; // New field
  };
  output_table: OutputTableRow[];
  tm_count: number | null;
  tm_identifiers?: string[]; // New field
  pumping_time: number | null;
  status: string;
}

export interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  tm_id: string; // New field
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
  completed_capacity: number; // New field
}

export interface CalendarDay {
  date: string;
  booked_tms: string[];
  booked_count: number;
  total_count: number;
  schedules: {
    _id: string;
    client_name: string;
    tm_count: number;
  }[];
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  status: 'available' | 'booked';
  schedule_id?: string;
}

// Plant API
export const plantApi = {
  getAllPlants: async () => {
    const response = await apiClient.get<ApiResponse<Plant[]>>('/plants');
    return response.data;
  },
  
  getPlant: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Plant>>(`/plants/${id}`);
    return response.data;
  },
  
  createPlant: async (data: Omit<Plant, '_id' | 'created_at'>) => {
    const response = await apiClient.post<ApiResponse<Plant>, typeof data>('/plants', data);
    return response.data;
  },
  
  updatePlant: async (id: string, data: Partial<Omit<Plant, '_id' | 'created_at'>>) => {
    const response = await apiClient.put<ApiResponse<Plant>, typeof data>(`/plants/${id}`, data);
    return response.data;
  },
  
  deletePlant: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/plants/${id}`);
    return response.data;
  },
};

// Client API
export const clientApi = {
  getAllClients: async () => {
    const response = await apiClient.get<ApiResponse<Client[]>>('/clients');
    return response.data;
  },
  
  getClient: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
    return response.data;
  },
  
  createClient: async (data: Omit<Client, '_id' | 'created_at'>) => {
    const response = await apiClient.post<ApiResponse<Client>, typeof data>('/clients', data);
    return response.data;
  },
  
  updateClient: async (id: string, data: Partial<Omit<Client, '_id' | 'created_at'>>) => {
    const response = await apiClient.put<ApiResponse<Client>, typeof data>(`/clients/${id}`, data);
    return response.data;
  },
  
  deleteClient: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/clients/${id}`);
    return response.data;
  },
};

// Transit Mixer API
export const tmApi = {
  getAllTMs: async () => {
    const response = await apiClient.get<ApiResponse<TransitMixer[]>>('/tms');
    return response.data;
  },
  
  getTM: async (id: string) => {
    const response = await apiClient.get<ApiResponse<TransitMixer>>(`/tms/${id}`);
    return response.data;
  },
  
  createTM: async (data: { identifier: string; capacity: number; plant_id?: string }) => {
    const response = await apiClient.post<ApiResponse<TransitMixer>, typeof data>('/tms', data);
    return response.data;
  },
  
  updateTM: async (id: string, data: { identifier: string; capacity: number; plant_id?: string }) => {
    const response = await apiClient.put<ApiResponse<TransitMixer>, typeof data>(`/tms/${id}`, data);
    return response.data;
  },
  
  deleteTM: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/tms/${id}`);
    return response.data;
  },
  
  getAverageCapacity: async () => {
    const response = await apiClient.get<ApiResponse<{ average_capacity: number }>>('/tms/average-capacity');
    return response.data;
  },
};

// Schedule API
export const scheduleApi = {
  getSchedules: async () => {
    const response = await apiClient.get<ApiResponse<Schedule[]>>("/schedules");
    return response.data;
  },

  getSchedule: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Schedule>>(`/schedules/${id}`);
    return response.data;
  },

  deleteSchedule: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/schedules/${id}`);
    return response.data;
  },

  // Step 1: Calculate TMs and create draft schedule
  calculateTMs: async (data: {
    client_id?: string;
    client_name?: string;
    site_location: string;
    input_params: {
      quantity: number;
      pumping_speed: number;
      onward_time: number;
      return_time: number;
      buffer_time: number;
      pump_start: string;
      schedule_date: string;
    };
  }) => {
    const response = await apiClient.post<
      ApiResponse<{ schedule_id: string; tm_count: number; tm_identifiers: string[] }>, 
      typeof data
    >("/schedules/calculate-tm", data);
    return response.data;
  },  

  // Get all available TMs for a specific date
  getAvailableTMs: async (date: string) => {
    const response = await apiClient.get<ApiResponse<TransitMixer[]>>(`/tms/available?date=${date}`);
    return response.data;
  },

  // Step 2: Generate schedule with selected TMs
  generateSchedule: async ({
    scheduleId,
    selected_tms
  }: {
    scheduleId: string;
    selected_tms: string[];
  }) => {
    const response = await apiClient.post<
      ApiResponse<Schedule>,
      { selected_tms: string[] }
    >(`/schedules/${scheduleId}/generate-schedule`, { selected_tms });
    return response.data;
  }
};

// Calendar API
export const calendarApi = {
  getCalendar: async (startDate: string, endDate: string, tmId?: string) => {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    if (tmId) params.append('tm_id', tmId);
    
    const response = await apiClient.post<ApiResponse<CalendarDay[]>, { start_date: string; end_date: string; tm_id?: string }>('/calendar', {
      start_date: startDate,
      end_date: endDate,
      tm_id: tmId
    });
    return response.data;
  },
  
  getTmAvailability: async (tmId: string, date: string) => {
    const response = await apiClient.get<ApiResponse<TimeSlot[]>>(`/calendar/tm/${tmId}?date_val=${date}`);
    return response.data;
  }
};
