import { apiClient, type ApiResponse } from '../lib/apiClient';

export interface CreateClassSlotPayload {
  schoolId: string;
  subjectId: string;
  teacherId?: string | null;
  classroom: string;
  dayOfWeek: string;
  dayIndex?: number;
  slotId: string;
  startTime: string;
  endTime: string;
  roomLocation?: string;
}

export interface TeacherScheduleResponse {
  ok: boolean;
  slots: any[];
  courses: any[];
  classes: any[];
}

export const scheduleService = {
  async getTimeSlots(schoolId?: string): Promise<ApiResponse<any[]>> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/time-slots${query}`);
  },

  async createClassSlot(payload: CreateClassSlotPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/schedule', {
      action: 'create_class_slot',
      ...payload,
    });
  },

  async deleteClassSlot(classId: string): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/schedule', {
      action: 'delete_slot',
      classId,
    });
  },

  async getTeacherSchedule(teacherId: string, schoolId?: string): Promise<TeacherScheduleResponse> {
    const params = new URLSearchParams({ action: 'teacher_schedule', teacherId });
    if (schoolId) params.append('schoolId', schoolId);
    return apiClient.get(`/api/school-admin/schedule?${params.toString()}`);
  },

  async getTeacherHoursMap(schoolId?: string): Promise<{ ok: boolean; hoursMap: Record<string, number> }> {
    const params = new URLSearchParams({ action: 'hours_map' });
    if (schoolId) params.append('schoolId', schoolId);
    return apiClient.get(`/api/school-admin/schedule?${params.toString()}`);
  },

  async getSchoolClasses(schoolId?: string): Promise<{ ok: boolean; classes: any[] }> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/schedule${query}`);
  },

  async replaceTimeSlots(schoolId: string, slots: any[]): Promise<ApiResponse> {
    return apiClient.put('/api/school-admin/time-slots', {
      schoolId,
      slots,
    });
  },
};