"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, StopCircle, RefreshCw, UserCheck, Loader2, Calendar } from "lucide-react"
import { api } from "@/lib/api"

const WS_URL = "ws://localhost:8000/ws/scanner"

export default function ScannerPage() {
  const [isActive, setIsActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [recentDetections, setRecentDetections] = useState<any[]>([])
  const [lastMatch, setLastMatch] = useState<any | null>(null)
  const [activeSession, setActiveSession] = useState<any | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  
  // Elementos para captura local
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Selección de clase
  const [subjects, setSubjects] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  
  const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null)

  useEffect(() => {
    loadInfo()
  }, [])

  const loadInfo = async () => {
    setLoadingSession(true)
    try {
      const [sessionsData, subjectsData] = await Promise.all([
        api.dashboard.activeSessions(),
        api.subjects.list()
      ])
      setSubjects(subjectsData)
      if (sessionsData && sessionsData.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        const todaySession = sessionsData.find((s: any) => s.fecha === today && s.estado === 'activa')
        if (todaySession) {
          setActiveSession(todaySession)
          setSelectedSubjectId(todaySession.materia_id?.toString() || "")
          setSelectedGroupId(todaySession.grupo_id?.toString() || "")
        }
      }
    } catch (err) {
      console.error("Error al cargar info inicial:", err)
    } finally {
      setLoadingSession(false)
    }
  }

  useEffect(() => {
    if (selectedSubjectId) {
      api.groups.list(parseInt(selectedSubjectId)).then(setGroups)
    } else {
      setGroups([])
    }
  }, [selectedSubjectId])

  const handleCreateSession = async () => {
    if (!selectedGroupId) return
    setLoadingSession(true)
    try {
      const newSession = await api.attendance.createSession(parseInt(selectedGroupId))
      setActiveSession(newSession)
      setCameraError(null)
    } catch (err) {
      setCameraError("Error al iniciar la sesión de clase")
    } finally {
      setLoadingSession(false)
    }
  }

  const startScanner = async () => {
    if (!activeSession) {
      setCameraError("Debes seleccionar una clase primero.")
      return
    }

    try {
      setCameraError(null)
      setLastMatch(null)
      
      // 1. Obtener acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      // 2. Conectar WebSocket
      const ws = new WebSocket(`${WS_URL}?session_id=${activeSession.id}&umbral=75`)
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.error) {
          setCameraError(data.error)
          stopScanner()
          return
        }
        if (data.frame) {
          setAnnotatedFrame(`data:image/jpeg;base64,${data.frame}`)
        }
        if (data.new_records && data.new_records.length > 0) {
          const match = data.new_records[0]
          setLastMatch(match)
          setRecentDetections(prev => [match, ...prev].slice(0, 5))
          stopScanner()
        }
      }

      ws.onopen = () => {
        setIsActive(true)
        // 3. Iniciar loop de envío de frames
        frameIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d')
            if (context) {
              context.drawImage(videoRef.current, 0, 0, 640, 480)
              const frameBase64 = canvasRef.current.toDataURL('image/jpeg', 0.6)
              ws.send(JSON.stringify({ frame: frameBase64 }))
            }
          }
        }, 150) // ~7 FPS para no saturar la red local pero mantener fluidez
      }

      ws.onerror = () => setCameraError("Error de comunicación con el motor facial.")
      ws.onclose = () => setIsActive(false)
      wsRef.current = ws

    } catch (err: any) {
      setCameraError("No se pudo acceder a la cámara. Por favor, otorga los permisos necesarios.")
    }
  }

  const stopScanner = () => {
    setIsActive(false)
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    if (wsRef.current) wsRef.current.close()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setAnnotatedFrame(null)
  }

  useEffect(() => {
    return () => stopScanner()
  }, [])

  return (
    <div className="p-8 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Escáner Facial</h1>
        <p className="text-slate-500 dark:text-slate-400">Captura local activa. Los datos se procesan y encriptan en el servidor local.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden rounded-2xl flex flex-col shadow-xl">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                  <span className="font-semibold text-sm">{isActive ? 'Escaneando desde Navegador' : 'Cámara Inactiva'}</span>
                </div>
                {activeSession && <span className="text-[10px] text-blue-500 font-bold tracking-wider uppercase">CLASE: {activeSession.materia}</span>}
              </div>
              
              <div className="flex gap-2">
                {!isActive ? (
                  <button onClick={startScanner} disabled={!activeSession} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Camera size={16} /> Iniciar Escáner
                  </button>
                ) : (
                  <button onClick={stopScanner} className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    <StopCircle size={16} /> Detener
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
              <canvas ref={canvasRef} width={640} height={480} className="hidden" />
              
              {cameraError ? (
                <div className="text-center p-6 text-red-400">
                  <Camera size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-medium">{cameraError}</p>
                </div>
              ) : !activeSession ? (
                <div className="w-full max-w-sm p-8 space-y-4">
                  <h3 className="text-xl font-bold text-white text-center">Configurar Asistencia</h3>
                  <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all">
                    <option value="">Selecciona materia...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                  <select value={selectedGroupId} disabled={!selectedSubjectId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all disabled:opacity-50">
                    <option value="">Selecciona grupo...</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                  <button onClick={handleCreateSession} disabled={!selectedGroupId || loadingSession} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
                    {loadingSession ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />} Iniciar Clase
                  </button>
                </div>
              ) : !isActive ? (
                <div className="text-center">
                  <div className="h-20 w-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <Camera size={38} />
                  </div>
                  <h3 className="text-white text-lg font-bold">Cámara Lista</h3>
                  <p className="text-slate-500 mb-6">Materia: {activeSession.materia}</p>
                  <button onClick={startScanner} className="bg-white text-black font-black px-8 py-3 rounded-2xl hover:bg-blue-50 transition-all">Activar Ahora</button>
                </div>
              ) : annotatedFrame ? (
                <img src={annotatedFrame} alt="Annotated Feed" className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <RefreshCw size={32} className="animate-spin mb-4" />
                  <p>Conectando con el motor de IA...</p>
                </div>
              )}

              {lastMatch && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full">
                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <UserCheck size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-1">¡Reconocido!</h2>
                    <p className="text-slate-500 mb-6"><span className="font-bold text-blue-600">{lastMatch.nombre}</span> ({lastMatch.confianza}%)</p>
                    <button onClick={startScanner} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 h-[500px] flex flex-col">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <UserCheck className="text-blue-500" /> Últimos Registros
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {recentDetections.length === 0 && <p className="text-sm text-slate-500 text-center mt-10">Esperando detecciones...</p>}
            {recentDetections.map((det, idx) => (
              <div key={idx} className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300">
                  {det.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{det.nombre}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Presente</p>
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">{det.confianza}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
