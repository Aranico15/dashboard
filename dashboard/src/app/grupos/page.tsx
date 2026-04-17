"use client"

import { useState, useEffect } from "react"
import { BookOpen, FolderPen, Users, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"

export default function GruposPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)

  const [isAddingSubject, setIsAddingSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")

  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Para vincular estudiantes
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [groupStudents, setGroupStudents] = useState<any[]>([])
  const [isLinking, setIsLinking] = useState(false)

  const AdminId = 1 // Simulamos que el docente logueado es el admin

  useEffect(() => {
    loadSubjects()
    loadAllStudents()
  }, [])

  const loadAllStudents = async () => {
    const data = await api.students.list()
    setAllStudents(data)
  }

  const loadSubjects = async () => {
    const data = await api.subjects.list()
    setSubjects(data)
  }

  const loadGroups = async (subjectId: number) => {
    const data = await api.groups.list(subjectId)
    setGroups(data)
  }

  const loadGroupStudents = async (groupId: number) => {
    const data = await api.groups.students(groupId)
    setGroupStudents(data)
  }

  const handleCreateSubject = async () => {
    if(!newSubjectName) return
    await api.subjects.create({ nombre: newSubjectName, docente_id: AdminId })
    setNewSubjectName("")
    setIsAddingSubject(false)
    loadSubjects()
  }

  const handleCreateGroup = async () => {
    if(!newGroupName || !selectedSubject) return
    await api.groups.create({ nombre: newGroupName, materia_id: selectedSubject.id, docente_id: AdminId })
    setNewGroupName("")
    setIsAddingGroup(false)
    loadGroups(selectedSubject.id)
  }

  const handleDeleteSubject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if(confirm("¿Eliminar esta materia? Se ocultará del sistema.")) {
      await api.subjects.delete(id)
      if(selectedSubject?.id === id) {
        setSelectedSubject(null)
        setGroups([])
      }
      loadSubjects()
    }
  }

  const handleDeleteGroup = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if(confirm("¿Eliminar este grupo?")) {
      await api.groups.delete(id)
      if(selectedGroup?.id === id) {
        setSelectedGroup(null)
        setGroupStudents([])
      }
      if(selectedSubject) loadGroups(selectedSubject.id)
    }
  }

  const handleAddStudentToGroup = async (studentId: number) => {
    if(!selectedGroup) return
    await api.groups.addStudent(selectedGroup.id, studentId)
    loadGroupStudents(selectedGroup.id)
  }

  const handleRemoveStudentFromGroup = async (studentId: number) => {
    if(!selectedGroup) return
    await api.groups.removeStudent(selectedGroup.id, studentId)
    loadGroupStudents(selectedGroup.id)
  }

  return (
    <div className="p-8 pb-20 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Materias y Grupos
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Clasifica tus clases y matricula estudiantes para tomar asistencia rápida.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        {/* Columna 1: Materias */}
        <div className="glass-card flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/> Materias</h3>
            <button onClick={() => setIsAddingSubject(!isAddingSubject)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"><Plus size={18} /></button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            {isAddingSubject ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-slide-up">
                <input 
                  autoFocus 
                  value={newSubjectName} 
                  onChange={e=>setNewSubjectName(e.target.value)} 
                  placeholder="Nombre de la materia..." 
                  className="w-full bg-white dark:bg-slate-950 px-3 py-2 text-sm rounded-lg outline-none border border-slate-200 dark:border-slate-700 mb-3 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button onClick={handleCreateSubject} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-blue-700 transition-colors">Guardar</button>
                  <button onClick={() => setIsAddingSubject(false)} className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg py-1.5 text-xs font-bold">X</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingSubject(true)}
                className="w-full py-3 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2 text-sm font-medium mb-2"
              >
                <Plus size={16} /> Crear Materia
              </button>
            )}
            
            {subjects.length === 0 && !isAddingSubject && <div className="p-8 text-center text-sm text-slate-400 italic">No hay materias.</div>}
            
            {subjects.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => { setSelectedSubject(sub); loadGroups(sub.id); setSelectedGroup(null); setIsAddingGroup(false); }}
                className={`p-4 flex justify-between items-center rounded-2xl cursor-pointer transition-all border group/item ${selectedSubject?.id === sub.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm'}`}
              >
                <div className={`font-bold ${selectedSubject?.id === sub.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{sub.nombre}</div>
                <button 
                  onClick={(e) => handleDeleteSubject(e, sub.id)}
                  className={`p-2 rounded-lg transition-all ${selectedSubject?.id === sub.id ? 'text-blue-200 hover:bg-white/10 hover:text-white' : 'text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 2: Grupos */}
        <div className="glass-card flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><FolderPen size={18} className="text-purple-500"/> Grupos</h3>
            {selectedSubject && <button onClick={() => setIsAddingGroup(!isAddingGroup)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"><Plus size={18} /></button>}
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            {!selectedSubject ? (
               <div className="flex h-full items-center justify-center text-slate-400 text-sm text-center p-8 italic">Selecciona una materia primero.</div>
            ) : (
               <>
                 {isAddingGroup ? (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 animate-slide-up mb-2">
                       <input 
                         autoFocus 
                         value={newGroupName} 
                         onChange={e=>setNewGroupName(e.target.value)} 
                         placeholder="Ej: Grupo A, 01, Diurno..." 
                         className="w-full bg-white dark:bg-slate-950 px-3 py-2 text-sm rounded-lg outline-none border border-slate-200 dark:border-slate-700 mb-3 focus:ring-2 focus:ring-purple-500"
                        />
                       <div className="flex gap-2">
                         <button onClick={handleCreateGroup} className="flex-1 bg-purple-600 text-white rounded-lg py-1.5 text-xs font-bold">Crear</button>
                         <button onClick={() => setIsAddingGroup(false)} className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg py-1.5 text-xs font-bold">X</button>
                       </div>
                    </div>
                 ) : (
                    <button 
                      onClick={() => setIsAddingGroup(true)}
                      className="w-full py-3 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-purple-500 hover:border-purple-400/50 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-all flex items-center justify-center gap-2 text-sm font-medium mb-2"
                    >
                      <Plus size={16} /> Nuevo Grupo
                    </button>
                 )}
                 {groups.length === 0 && !isAddingGroup && <div className="p-8 text-center text-sm text-slate-400 italic">No hay grupos para esta materia.</div>}
                 {groups.map(grp => (
                    <div 
                      key={grp.id} 
                      onClick={() => { setSelectedGroup(grp); loadGroupStudents(grp.id); setIsLinking(false) }}
                      className={`p-4 flex justify-between items-center rounded-2xl cursor-pointer transition-all border group/item ${selectedGroup?.id === grp.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm'}`}
                    >
                      <div className={`font-mono font-bold ${selectedGroup?.id === grp.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{grp.nombre}</div>
                      <button 
                        onClick={(e) => handleDeleteGroup(e, grp.id)}
                        className={`p-2 rounded-lg transition-all ${selectedGroup?.id === grp.id ? 'text-purple-200 hover:bg-white/10 hover:text-white' : 'text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
               </>
            )}
          </div>
        </div>

        {/* Columna 3: Estudiantes Asignados */}
        <div className="glass-card flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Users size={18} className="text-orange-500"/> Alumnos</h3>
            {selectedGroup && <button onClick={() => setIsLinking(!isLinking)} className={`${isLinking ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'} px-2 py-1 text-xs font-semibold rounded-md transition-colors shadow-sm`}>{isLinking ? 'Modo Visualizar' : 'Matricular'}</button>}
          </div>
          <div className="p-2 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20">
             {!selectedGroup ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm text-center p-4">Selecciona un grupo para ver quiénes están matriculados.</div>
             ) : isLinking ? (
                <div className="space-y-1">
                   <div className="p-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Toca para incluir/excluir</div>
                   {allStudents.map(st => {
                      const isEnrolled = groupStudents.find(g => g.id === st.id)
                      return (
                         <div 
                            key={`all-${st.id}`} 
                            onClick={() => isEnrolled ? handleRemoveStudentFromGroup(st.id) : handleAddStudentToGroup(st.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${isEnrolled ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
                         >
                            <span className="text-sm font-medium">{st.nombre} {st.apellido}</span>
                            {isEnrolled ? <CheckCircle2 className="text-green-600" size={16}/> : <Plus className="text-slate-400" size={16}/>}
                         </div>
                      )
                   })}
                </div>
             ) : (
                <div className="space-y-1">
                   {groupStudents.length === 0 ? (
                      <div className="flex flex-col h-full items-center justify-center text-slate-400 text-sm text-center p-4 mt-8">
                         Ningún estudiante asignado.<br/>Haz clic en "Matricular".
                      </div>
                   ) : (
                      groupStudents.map(st => (
                         <div key={`enrolled-${st.id}`} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg">
                            <span className="text-sm font-medium">{st.nombre} {st.apellido}</span>
                            <button onClick={()=>handleRemoveStudentFromGroup(st.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                         </div>
                      ))
                   )}
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
