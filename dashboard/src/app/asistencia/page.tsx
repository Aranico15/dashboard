"use client"

import { useState, useEffect } from "react"
import { History, Download, Calendar, Users, ArrowRight, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export default function AsistenciaPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const data = await api.attendance.sessions()
      setSessions(data)
    } catch (err) {
      console.error("Error al cargar historial:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    const pass = prompt("Para eliminar esta sesión y todos sus registros, ingresa la clave de seguridad:")
    if (pass === "2026-USTA") {
      try {
        await api.attendance.deleteSession(id)
        setSessions(sessions.filter(s => s.id !== id))
      } catch (err) {
        alert("Error al eliminar sesión")
      }
    } else if (pass !== null) {
      alert("Clave incorrecta. No se han borrado los datos.")
    }
  }

  const handleViewDetails = async (session: any) => {
    setSelectedSession(session)
    setLoadingRecords(true)
    try {
      const data = await api.attendance.sessionRecords(session.id)
      setRecords(data)
    } catch (err) {
      console.error("Error al cargar registros:", err)
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleExport = async () => {
    window.open("http://localhost:8000/api/export/excel", "_blank")
  }

  return (
    <div className="p-8 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Historial de Asistencia
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Consulta los registros consolidados de todas tus clases y descarga reportes.
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 active:scale-95"
        >
          <Download size={18} />
          Descargar Global (Excel)
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center rounded-2xl animate-pulse">
           Cargando registros...
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center justify-center text-slate-500">
          <History size={48} className="mb-4 opacity-50 text-blue-500" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No hay registros aún</h3>
          <p className="max-w-md mx-auto">
            Inicia una sesión en el Escáner para comenzar a registrar asistencia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sessions.map((session) => (
             <div key={session.id} className="glass-card rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group relative">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-blue-50 dark:bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                    <Calendar size={24} />
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => handleDeleteSession(e, session.id)}
                     className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                     title="Borrar Sesión"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                   </button>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${session.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {session.estado}
                   </span>
                 </div>
               </div>
               
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                 {session.materia || "Materia desconocida"}
               </h3>
               <p className="text-slate-500 text-sm mb-4 flex items-center gap-1.5 font-mono">
                 Grupo {session.grupo || "A"} • {session.fecha}
               </p>

               <div className="flex items-center gap-4 py-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Asistentes</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1">
                       <Users size={16} /> {session.presentes}
                    </span>
                  </div>
                  <div className="flex-1"></div>
                  <button 
                    onClick={() => handleViewDetails(session)}
                    className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                  >
                     <ArrowRight size={18} />
                  </button>
               </div>
             </div>
           ))}
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Asistencia: {selectedSession.materia}
                </h3>
                <p className="text-slate-500 text-sm">
                  Grupo {selectedSession.grupo} • {selectedSession.fecha}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="animate-spin mb-4"><Loader2 size={32} /></div>
                  <p>Cargando lista de asistentes...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No hay registros de asistencia para esta sesión.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          {record.nombre?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{record.nombre}</p>
                          <p className="text-xs text-slate-500">Confianza: {record.confianza}%</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500 font-mono">
                        {new Date(record.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedSession(null)}
                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


