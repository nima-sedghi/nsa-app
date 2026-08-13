async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "یه خطایی پیش اومد");
  }
  return data;
}

export const api = {
  getCourses: () => request("/api/courses"),
  createCourse: (name: string, professors: string[]) =>
    request("/api/courses", { method: "POST", body: JSON.stringify({ name, professors }) }),
  renameCourse: (id: string, name: string) =>
    request(`/api/courses/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteCourse: (id: string) => request(`/api/courses/${id}`, { method: "DELETE" }),
  clearCourseVotes: (id: string) => request(`/api/courses/${id}/votes`, { method: "DELETE" }),
  addProfessor: (courseId: string, name: string) =>
    request(`/api/courses/${courseId}/professors`, { method: "POST", body: JSON.stringify({ name }) }),
  removeProfessor: (courseId: string, profId: string) =>
    request(`/api/courses/${courseId}/professors/${profId}`, { method: "DELETE" }),
  importCourses: (groups: { name: string; professors: string[] }[]) =>
    request("/api/courses/import", { method: "POST", body: JSON.stringify({ groups }) }),

  vote: (studentId: string, courseId: string, professorId: string) =>
    request("/api/vote", { method: "POST", body: JSON.stringify({ studentId, courseId, professorId }) }),
  getResults: (studentId: string) => request(`/api/results?studentId=${encodeURIComponent(studentId)}`),
  getAdminResults: () => request("/api/admin/results"),

  getRosterConfig: () => request("/api/roster/config"),
  setRosterConfig: (mode: string, minLen: number, maxLen: number) =>
    request("/api/roster/config", { method: "POST", body: JSON.stringify({ mode, minLen, maxLen }) }),
  getRoster: () => request("/api/roster"),
  addRosterIds: (ids: string[]) => request("/api/roster", { method: "POST", body: JSON.stringify({ ids }) }),
  clearRoster: () => request("/api/roster", { method: "DELETE" }),

  adminLogin: (password: string) => request("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  adminLogout: () => request("/api/admin/logout", { method: "POST" }),
  adminMe: () => request("/api/admin/me"),
};
