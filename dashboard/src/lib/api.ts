const API_BASE = "http://localhost:8000/api"

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || "Error en la solicitud a la API")
  }
  
  return response.json()
}

export const api = {
  students: {
    list: () => fetchApi("/students"),
    create: (data: {nombre: string, apellido: string, codigo_estudiante: string}) => 
      fetchApi("/students", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => fetchApi(`/students/${id}`, { method: "DELETE" }),
  },
  subjects: {
    list: () => fetchApi("/subjects"),
    create: (data: { nombre: string, docente_id: number }) => 
      fetchApi("/subjects", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/subjects/${id}`, { method: "DELETE" }),
  },
  groups: {
    list: (materiaId?: number) => fetchApi(`/groups${materiaId ? `?materia_id=${materiaId}` : ''}`),
    create: (data: { nombre: string, materia_id: number, docente_id: number }) => 
      fetchApi("/groups", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/groups/${id}`, { method: "DELETE" }),
    students: (groupId: number) => fetchApi(`/groups/${groupId}/students`),
    addStudent: (groupId: number, studentId: number) => 
      fetchApi(`/groups/${groupId}/students`, { method: "POST", body: JSON.stringify({ estudiante_id: studentId }) }),
    removeStudent: (groupId: number, studentId: number) => 
      fetchApi(`/groups/${groupId}/students/${studentId}`, { method: "DELETE" }),
  },
  dashboard: {
    today: () => fetchApi("/attendance/today"),
    activeSessions: () => fetchApi("/attendance/sessions"),
  },
  attendance: {
    sessions: () => fetchApi("/attendance/sessions"),
    createSession: (grupoId: number) => fetchApi(`/attendance/sessions?grupo_id=${grupoId}`, { method: "POST" }),
    deleteSession: (id: number) => fetchApi(`/attendance/sessions/${id}`, { method: "DELETE" }),
    sessionRecords: (id: number) => fetchApi(`/attendance/sessions/${id}/records`),
  },
  teachers: {
    get: (id: number) => fetchApi(`/teachers/${id}`),
    update: (id: number, data: { nombre?: string, email?: string, password?: string, preferencias?: any }) => 
      fetchApi(`/teachers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  }
}
