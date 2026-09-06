import { apiClient, type ApiResponse } from '../lib/apiClient';

export interface UpdateStudentPayload {
  studentId: string;
  name: string;
  documentId?: string;
  email: string;
}

export const studentService = {
  async createStudent(payload: any): Promise<ApiResponse> {
    return apiClient.post('/api/admin/create-student', payload);
  },
  async resendInvitation(email: string, schoolId: string, name: string = 'Estudiante'): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/students', {
      action: 'resend_invitation',
      email,
      name,
      schoolId,
    });
  },

  async updateStudent(payload: UpdateStudentPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/students', {
      action: 'update',
      ...payload,
    });
  },

  async transferStudent(studentId: string, targetGroup: string): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/students', {
      action: 'transfer',
      studentId,
      targetGroup,
    });
  },

  async deleteStudent(studentId: string): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/students', {
      action: 'delete',
      studentId,
    });
  },

  async getStudents(schoolId?: string): Promise<ApiResponse<any[]>> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/students${query}`);
  },
};