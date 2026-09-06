import { apiClient, type ApiResponse } from '../lib/apiClient';

export interface CreateTeacherPayload {
  email: string;
  name: string;
  schoolId: string;
  teacherCode?: string;
  avatarUrl?: string;
  specialty?: string;
  jobTitle?: string;
  phone?: string;
}

export interface UpdateTeacherPayload {
  teacherId: string;
  name: string;
  teacherCode?: string;
  avatarUrl?: string;
  specialty?: string;
  jobTitle?: string;
  phone?: string;
}

export interface ManageTeacherStatusPayload {
  teacherId: string;
  isDelete: boolean;
  newStatus?: string | null;
}

export const teacherService = {
  async createTeacher(payload: CreateTeacherPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/teachers', {
      action: 'create',
      ...payload,
    });
  },

  async updateTeacher(payload: UpdateTeacherPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/teachers', {
      action: 'update',
      ...payload,
    });
  },

  async manageTeacherStatus(payload: ManageTeacherStatusPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/teachers', {
      action: 'manage_status',
      ...payload,
    });
  },

  async resendInvitation(email: string, schoolId: string, name: string = 'Docente'): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/teachers', {
      action: 'resend_invitation',
      email,
      schoolId,
      name,
    });
  },

  async getTeachers(schoolId?: string): Promise<ApiResponse<any[]>> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/teachers${query}`);
  },
  async getVirtualClassroomDetails(courseId: string, classroom: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ courseId, classroom });
    return apiClient.get(`/api/teacher/virtual-classroom?${params.toString()}`);
  },

  async getLabCatalog(): Promise<any> {
    return apiClient.get('/api/teacher/labs?action=catalog');
  },

  async getLabTokens(courseId: string): Promise<any> {
    return apiClient.get(`/api/teacher/labs?action=tokens&courseId=${encodeURIComponent(courseId)}`);
  },

  async assignLabTokens(courseId: string, labId: string, tokenCount: number): Promise<any> {
    return apiClient.post('/api/teacher/labs', {
      action: 'assign_tokens',
      courseId,
      labId,
      tokenCount,
    });
  },

  async updateLabFeedback(tokenId: string, feedbackText: string): Promise<any> {
    return apiClient.post('/api/teacher/labs', {
      action: 'update_feedback',
      tokenId,
      feedbackText,
    });
  },

  async assignLabBatch(labId: string, courseId: string): Promise<any> {
    return apiClient.post('/api/teacher/labs', {
      action: 'assign_batch',
      labId,
      courseId,
    });
  },
  async launchLab(courseId: string, labId: string): Promise<any> {
    return apiClient.post('/api/teacher/labs', {
      action: 'launch',
      courseId,
      labId,
    });
  },
  async getTeacherStudents(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/api/teacher/students');
  },
};