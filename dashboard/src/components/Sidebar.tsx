"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { useSidebar } from "./SidebarContext"
import { 
  LayoutDashboard, 
  Users, 
  Camera, 
  Settings, 
  BookOpen,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scanner", label: "Escáner", icon: Camera },
  { href: "/estudiantes", label: "Estudiantes", icon: Users },
  { href: "/grupos", label: "Materias y Grupos", icon: BookOpen },
  { href: "/asistencia", label: "Historial", icon: History },
  { href: "/configuracion", label: "Configuración", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar sesión activa
        const sessions = await api.dashboard.activeSessions()
        const today = new Date().toISOString().split('T')[0]
        setHasActiveSession(sessions.some((s: any) => s.fecha === today && s.estado === 'activa'))
        
        // Cargar info del docente (ID 1 por defecto)
        const tData = await api.teachers.get(1)
        setTeacher(tData)
      } catch (e) {}
    }

    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className={`fixed left-0 top-0 bottom-0 glass border-r bg-white/50 dark:bg-black/50 z-40 hidden md:flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Botón de Colapso */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-10 bg-blue-600 text-white rounded-full p-1 shadow-lg border-2 border-white dark:border-slate-900 z-50 hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={`p-6 flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Camera size={18} className="text-white" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100 animate-in fade-in duration-500">
            USTA FaceAuth
          </span>
        )}
      </div>

      {/* Navegación */}
      <nav className={`flex-1 px-4 space-y-1 overflow-y-auto pt-4 ${isCollapsed ? 'px-2' : ''}`}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const isScanner = item.href === "/scanner"
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : ""}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${
                isActive 
                  ? "bg-blue-600 shadow-md shadow-blue-500/20 text-white" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon size={18} className={isActive ? "text-white" : "group-hover:text-blue-500"} />
              {!isCollapsed && <span className="font-medium text-sm animate-in slide-in-from-left-2 duration-300">{item.label}</span>}
              
              {isScanner && hasActiveSession && (
                <span className={`absolute right-3 h-2 w-2 rounded-full bg-red-500 animate-pulse border-2 border-white dark:border-slate-900 ${isCollapsed ? 'top-2 right-2' : ''}`}></span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Info Docente */}
      <div className={`p-4 m-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg transition-all ${isCollapsed ? 'm-2 p-2' : ''}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
              {teacher?.nombre?.charAt(0) || "D"}
            </div>
          </div>
        ) : (
          <>
            <p className="text-[10px] uppercase font-bold opacity-70 mb-1 tracking-wider">Docente Activo</p>
            <p className="text-sm font-black truncate">{teacher?.nombre || "Cargando..."}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[10px] font-medium opacity-90">En Línea</span>
              </div>
              <LogOut size={14} className="opacity-50 hover:opacity-100 cursor-pointer" />
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
