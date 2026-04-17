"use client"

import { useState, useEffect, useRef } from "react"
import { Users, UserPlus, Trash2, Camera, RefreshCw, CheckCircle2, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

export default function EstudiantesPage() {
  const [isAdding, setIsAdding] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estados del Formulario
  const [formData, setFormData] = useState({ nombre: "", apellido: "", codigo_estudiante: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Estados de la Captura Facial
  const [capturePhase, setCapturePhase] = useState<"form" | "capturing" | "training" | "success">("form")
  const [captureData, setCaptureData] = useState({ progress: 0, count: 0, total: 30, frame: "" })
  const [searchTerm, setSearchTerm] = useState("")
  
  // Referencias para captura local
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const filteredStudents = students.filter(st => 
    st.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.codigo_estudiante.includes(searchTerm)
  )

  const loadStudents = async () => {
    try {
      const data = await api.students.list()
      setStudents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que deseas eliminar a este estudiante? Sus datos biométricos encriptados también serán borrados.")) {
      try {
        await api.students.delete(id)
        loadStudents()
      } catch (error: any) {
        alert("Error al eliminar: " + error.message)
      }
    }
  }

  const startCaptureProcess = async () => {
    if (!formData.nombre || !formData.apellido || !formData.codigo_estudiante) {
      setErrorMsg("Por favor, llena todos los campos.")
      return
    }
    
    setErrorMsg("")
    setIsSubmitting(true)
    try {
      // 1. Guardar en Base de Datos primero para obtener el face_label_id
      const newStudent = await api.students.create(formData)
      
      // 2. Solicitar cámara
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      // 3. Conectar WebSocket de captura
      setCapturePhase("capturing")
      const ws = new WebSocket(`ws://localhost:8000/ws/capture/${newStudent.face_label_id}`)
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.error) {
          setErrorMsg(data.error)
          stopCapture()
          return
        }

        if (data.frame) {
          setCaptureData(prev => ({
            ...prev,
            frame: `data:image/jpeg;base64,${data.frame}`,
            count: data.count,
            progress: data.progress,
            total: data.total
          }))
        }

        if (data.training) {
          setCapturePhase("training")
          if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
        }

        if (data.completed) {
          loadStudents()
          setCapturePhase("success")
          stopCaptureStreamOnly()
        }
      }

      ws.onopen = () => {
        // Enviar frames periódicamente
        frameIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d')
            if (context) {
              context.drawImage(videoRef.current, 0, 0, 640, 480)
              const frameBase64 = canvasRef.current.toDataURL('image/jpeg', 0.6)
              ws.send(JSON.stringify({ frame: frameBase64 }))
            }
          }
        }, 200) // Un frame cada 200ms es suficiente para registro
      }

      ws.onerror = () => {
        setErrorMsg("Error de conexión con el motor de captura.")
        stopCapture()
      }
      
      wsRef.current = ws

    } catch (error: any) {
      setErrorMsg("No se pudo iniciar la captura: " + error.message)
      setCapturePhase("form")
    } finally {
      setIsSubmitting(false)
    }
  }

  const stopCaptureStreamOnly = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
  }

  const stopCapture = () => {
    stopCaptureStreamOnly()
    if (wsRef.current) wsRef.current.close()
    setCapturePhase("form")
  }

  const closeWizard = () => {
    setIsAdding(false)
    stopCapture()
    setFormData({ nombre: "", apellido: "", codigo_estudiante: "" })
    setCaptureData({ progress: 0, count: 0, total: 30, frame: "" })
  }

  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  return (
    <div className="p-8 pb-20">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Estudiantes</h1>
          <p className="text-slate-500 dark:text-slate-400">Las fotos se encriptan localmente para garantizar la privacidad.</p>
        </div>
        <button 
          onClick={() => isAdding ? closeWizard() : setIsAdding(true)}
          className={`${isAdding ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'} px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm`}
        >
          {isAdding ? "Cerrar" : <><UserPlus size={18} /> Nuevo Estudiante</>}
        </button>
      </div>

      {isAdding && (
        <div className="glass-card p-6 rounded-2xl mb-8 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 transition-all">
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />
          <canvas ref={canvasRef} width={640} height={480} className="hidden" />

          {capturePhase === "form" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-semibold text-lg mb-4 text-blue-600 flex items-center gap-2">
                <Camera size={20} /> Paso 1: Información básica
              </h3>
              {errorMsg && <div className="p-3 mb-4 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">{errorMsg}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
                  <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Apellido</label>
                  <input type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código</label>
                  <input type="text" value={formData.codigo_estudiante} onChange={e => setFormData({...formData, codigo_estudiante: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={startCaptureProcess} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2.5 px-8 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Siguiente: Biometría"}
                </button>
              </div>
            </div>
          )}

          {capturePhase === "capturing" && (
            <div className="flex flex-col items-center justify-center py-4 animate-in fade-in duration-500">
              <h3 className="font-bold text-xl mb-1">Paso 2: Registro Facial</h3>
              <p className="text-slate-500 mb-6 flex items-center gap-2">Mueve la cabeza ligeramente: <span className="text-blue-600 font-bold">{captureData.count} de {captureData.total}</span></p>
              <div className="w-full max-w-sm aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl mb-6 relative border-4 border-blue-500/20">
                 {captureData.frame ? (
                   <img src={captureData.frame} alt="Live Stream" className="w-full h-full object-cover" />
                 ) : (
                   <div className="flex w-full h-full items-center justify-center text-white"><Loader2 className="animate-spin" /></div>
                 )}
              </div>
              <div className="w-full max-w-sm h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${captureData.progress}%` }}></div>
              </div>
            </div>
          )}

          {capturePhase === "training" && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-pulse">
                <RefreshCw size={48} className="animate-spin text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Protegiendo datos...</h3>
                <p className="text-slate-500">Estamos encriptando tus fotos y entrenando el modelo de seguridad.</p>
            </div>
          )}

          {capturePhase === "success" && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-black mb-2">¡Completado!</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-8">El perfil de <span className="font-bold text-blue-600">{formData.nombre}</span> está listo y securizado.</p>
                <button onClick={closeWizard} className="bg-slate-900 hover:bg-black dark:bg-white dark:text-black font-bold py-3 px-10 rounded-2xl transition-all shadow-xl">Listos</button>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <input 
            type="text" 
            placeholder="Buscar estudiante..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm w-full max-w-xs outline-none focus:border-blue-500 transition-all"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/40">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Seguridad Facial</th>
                <th className="px-6 py-4 text-right">Acclones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="py-10 text-center text-slate-400"><Loader2 className="animate-spin inline-block mr-2" /> Cargando base de datos...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-500 font-medium">No hay registros aún.</td></tr>
              ) : (
                filteredStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{st.nombre} {st.apellido}</td>
                    <td className="px-6 py-4 font-mono text-xs">{st.codigo_estudiante}</td>
                    <td className="px-6 py-4">
                      {st.tiene_rostro ? (
                        <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs"><CheckCircle2 size={12}/> Encriptado</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(st.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
