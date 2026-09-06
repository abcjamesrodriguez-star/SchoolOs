import { apiClient } from '../lib/apiClient';

export const teacherTenantService = {
  async getTeacherContext() {
    try {
      const res = await apiClient.get<any>('/api/auth/me');
      if (!res.ok || !res.profile) return null;
      return {
        ...res.profile,
        school: res.school || { id: res.profile.schoolId, name: res.profile.schoolName, slug: res.profile.schoolSlug },
      };
    } catch (err) {
      console.error('[teacherTenantService.getTeacherContext] Error:', err);
      return null;
    }
  },

  async getTeacherClasses(_teacherId?: string) {
    try {
      const res = await apiClient.get<any>('/api/teacher/classes');
      return res.data || [];
    } catch (err) {
      console.error('[teacherTenantService.getTeacherClasses] Error:', err);
      return [];
    }
  },

  async getTeacherCourses(_teacherId?: string) {
    try {
      const res = await apiClient.get<any>('/api/teacher/courses');
      return res.data || [];
    } catch (err) {
      console.error('[teacherTenantService.getTeacherCourses] Error:', err);
      return [];
    }
  },

  async getCourseStudents(courseId: string) {
    try {
      const res = await apiClient.get<any>(`/api/teacher/students?courseId=${encodeURIComponent(courseId)}`);
      return res.data || [];
    } catch (err) {
      console.error('[teacherTenantService.getCourseStudents] Error:', err);
      return [];
    }
  },
};

