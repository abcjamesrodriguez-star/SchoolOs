import { apiClient, type ApiResponse } from '../lib/apiClient';

export interface SubjectPayload {
  name: string;
  code: string;
  grade_level: string;
  hours_per_week: number;
  color?: string;
  qualified_teacher_ids?: string[];
}

export interface UpsertGradeCapacityPayload {
  schoolId: string;
  gradeLevel: string;
  capacityPerRoom: number;
  sectionsCount: number;
  isOffered: boolean;
}

export const courseManagementService = {
  async getGradeCapacities(schoolId?: string): Promise<ApiResponse<any[]>> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/grade-capacity${query}`);
  },
  async getSubjects(schoolId?: string): Promise<ApiResponse<any[]>> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get(`/api/school-admin/subjects${query}`);
  },

  async initSubjects(schoolId: string, subjects: any[]): Promise<ApiResponse<any[]>> {
    return apiClient.post('/api/school-admin/subjects', {
      action: 'init_subjects',
      schoolId,
      subjects,
    });
  },
  async createSubject(schoolId: string, payload: SubjectPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/subjects', {
      action: 'create',
      schoolId,
      payload,
    });
  },

  async updateSubject(subjectId: string, payload: SubjectPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/subjects', {
      action: 'update',
      subjectId,
      payload,
    });
  },

  async assignTeacher(subjectId: string, teacherId: string): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/subjects', {
      action: 'assign_teacher',
      subjectId,
      teacherId,
    });
  },

  async upsertGradeCapacity(payload: UpsertGradeCapacityPayload): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/grade-capacity', {
      action: 'upsert',
      ...payload,
    });
  },

  async deleteGradeCapacity(schoolId: string, gradeLevel: string): Promise<ApiResponse> {
    return apiClient.post('/api/school-admin/grade-capacity', {
      action: 'delete',
      schoolId,
      gradeLevel,
    });
  },

  async deleteCourse(id: string): Promise<ApiResponse> {
    return apiClient.delete('/api/school-admin/courses', { id });
  },
  async initDefaultGrades(defaultGrades: any[]): Promise<ApiResponse<any[]>> {
    return apiClient.post('/api/school-admin/courses', {
      action: 'init_grades',
      defaultGrades,
    });
  },
};