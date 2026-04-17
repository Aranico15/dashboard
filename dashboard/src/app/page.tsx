"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Users, 
  UserCheck, 
  Clock, 
  CalendarCheck,
  Camera,
  RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"

export default function Home() {
  const [stats, setStats] = useState({
    estudiantesActivos: 0,
    presentesHoy: 0,
    sesionesActivas: 0,
  })
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [students, today, sessions] = await Promise.all([
          api.students.list(),
          api.dashboard.today(),
          api.dashboard.activeSessions()
        ])

        setStats({
          estudiantesActivos: students.length,
          presentesHoy: today.presentes,
          sesionesActivas: sessions.filter((s:any) => s.estado === 'activa').length,
        })
        
        setRecentSessions(sessions.slice(0, 5))
      } catch (error) {
        console.error("Error cargando dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
    // Refrescar cada 10 segundos
    const interval = setInterval(loadDashboardData, 10000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-500 mb-4" size={32} />
      </div>
    )
  }

  // Prevenir división por cero
  const porcentajeAsistencia = stats.estudiantesActivos > 0 
    ? Math.round((stats.presentesHoy / stats.estudiantesActivos) * 100) 
    : 0

  return (
    <div className="p-8 pb-20">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Resumen en vivo de la asistencia. Datos reales sincronizados.
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Estudiantes Activos" 
          value={stats.estudiantesActivos.toString()} 
          change="Sincronizado" 
          icon={<Users size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Asistencia Exacta Hoy" 
          value={`${porcentajeAsistencia}%`} 
          change={`${stats.presentesHoy} Presentes`} 
          icon={<UserCheck size={24} />} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Sesiones Activas" 
          value={stats.sesionesActivas.toString()} 
          change="Clases cursadas hoy" 
          icon={<CalendarCheck size={24} />} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Registro Asistencia" 
          value="Automático" 
          change="LBPH Engine 2.0" 
          icon={<Clock size={24} />} 
          color="bg-indigo-500" 
        />
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 flex flex-col min-h-[400px]">
          <h3 className="font-semibold text-lg mb-6 flex items-center justify-between">
            <span>Últimas Sesiones Creadas</span>
            <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
              Historial
            </span>
          </h3>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 border-b">
                 <tr>
                   <th className="px-4 py-3">Fecha</th>
                   <th className="px-4 py-3">Grupo</th>
                   <th className="px-4 py-3">Registros</th>
                   <th className="px-4 py-3">Estado</th>
                 </tr>
               </thead>
               <tbody>
                 {recentSessions.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="text-center py-6 text-slate-400">No hay sesiones creadas.</td>
                   </tr>
                 ) : (
                   recentSessions.map(sess => (
                     <tr key={sess.id} className="border-b border-slate-100 dark:border-slate-800">
                       <td className="px-4 py-3 font-medium">{sess.fecha}</td>
                       <td className="px-4 py-3">{sess.grupo_nombre || `Grupo ${sess.grupo_id}`}</td>
                       <td className="px-4 py-3">{sess.total_registros}</td>
                       <td className="px-4 py-3">
                         {sess.estado === 'activa' 
                           ? <span className="text-green-600 dark:text-green-400 font-bold animate-pulse">Activa</span>
                           : <span className="text-slate-500">Cerrada</span>
                         }
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
          </div>
        </div>

        {/* Panel Lateral: Accesos Rápidos */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            Accesos Rápidos
          </h3>
          
          <div className="space-y-4">
            <Link href="/scanner" className="block w-full">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 transition-colors rounded-xl p-6 text-white shadow-lg cursor-pointer flex flex-col items-center justify-center gap-3">
                <Camera size={36} />
                <span className="font-semibold text-lg">Abrir Escáner</span>
                <span className="text-center text-xs opacity-80">Reconoce rostros y marca asistencia en la base de datos</span>
              </div>
            </Link>

            <Link href="/estudiantes" className="block w-full">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-xl p-4 text-slate-800 dark:text-slate-100 shadow-sm cursor-pointer flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users size={24} />
                </div>
                <div>
                  <span className="font-semibold block mb-0.5">Añadir Estudiante</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Captura nuevos rostros con IA</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon, color }: { title: string, value: string, change: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col justify-between overflow-hidden relative group">
      <div className={`absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500 ${color}`} />
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <h4 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h4>
        </div>
        <div className={`p-2 rounded-xl text-white shadow-sm ${color}`}>
          {icon}
        </div>
      </div>
      
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {change}
      </p>
    </div>
  )
}
