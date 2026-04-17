"use client"
import { useState, useEffect } from "react"
import { Settings, Moon, Sun, User, Mail, Save, Loader2, CheckCircle2 } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { api } from "@/lib/api"

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme()
  const [teacher, setTeacher] = useState({ nombre: "", email: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadTeacher()
  }, [])

  const loadTeacher = async () => {
    try {
      const data = await api.teachers.get(1)
      setTeacher({ nombre: data.nombre, email: data.email })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    try {
      await api.teachers.update(1, teacher)
      setMessage("¡Perfil actualizado con éxito!")
      setTimeout(() => setMessage(""), 3000)
    } catch (e) {
      setMessage("Error al actualizar el perfil")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 pb-20 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Configuración
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Personaliza tu perfil de docente y ajustes del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: Perfil */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <User className="text-blue-500" size={20} />
              Perfil del Docente
            </h3>

            {loading ? (
              <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm">Cargando datos...</p>
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={teacher.nombre}
                      onChange={(e) => setTeacher({...teacher, nombre: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="Ej: Lic. Juan Pérez"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={teacher.email}
                      onChange={(e) => setTeacher({...teacher, email: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="juan.perez@usta.edu.co"
                    />
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    <CheckCircle2 size={16} />
                    {message}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Guardar Cambios
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Columna Derecha: Apariencia y Otros */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-xl mb-6 text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="text-amber-500" size={20} />
              Apariencia
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 transition-all hover:border-blue-500/30 group">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Tema Visual</p>
                <p className="text-xs text-slate-500">Alternar modo claro o oscuro.</p>
              </div>
              
              <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl">
                <button 
                  onClick={() => setTheme("light")}
                  className={`p-2.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-md text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sun size={20} />
                </button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`p-2.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-700 shadow-md text-blue-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Moon size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="text-slate-400" size={20} />
              Motor de Reconocimiento
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  Umbral de Confianza
                </label>
                <div className="flex items-center gap-4">
                  <input type="range" min="50" max="95" defaultValue="75" className="flex-1 accent-blue-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  <span className="font-mono font-bold text-sm bg-blue-600 text-white px-3 py-1 rounded-full shadow-md">75%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic">
                  * Un porcentaje más alto requiere que la cara sea más nítida para reconocerla. 75% es el valor óptimo para el modelo LBPH.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
