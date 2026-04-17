"""
main.py - FastAPI: REST API + WebSockets para el sistema de asistencia facial UST
Ejecutar: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""
import asyncio
import base64
import json
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import (
    BackgroundTasks, Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import (
    AttendanceRecord, AttendanceSession, Group, GroupStudent,
    Student, Subject, Teacher, get_db, init_db
)
from .export_manager import ExportManager
from .face_engine import face_engine

# ── APP ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="AsistenciaFacial UST", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("data/students").mkdir(parents=True, exist_ok=True)
Path("modelos").mkdir(parents=True, exist_ok=True)
# Eliminado el mount de /photos porque ahora los archivos están encriptados y no se pueden servir estáticamente.

export_manager = ExportManager()
training_status = {"is_training": False, "message": "", "progress": 0}


@app.on_event("startup")
async def startup():
    init_db()
    face_engine.initialize()
    db = next(get_db())
    try:
        students = db.query(Student).filter(Student.activo == True).all()
        face_engine.update_label_map(students)
    finally:
        db.close()


# ── AUTH & TEACHERS ──────────────────────────────────────────────────────────

class LoginReq(BaseModel):
    email: str
    password: str

class TeacherUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    preferencias: Optional[dict] = None

@app.get("/api/teachers/{tid}")
def get_teacher(tid: int, db: Session = Depends(get_db)):
    t = db.query(Teacher).get(tid)
    if not t:
        raise HTTPException(404, "Docente no encontrado")
    return {
        "id": t.id,
        "nombre": t.nombre,
        "email": t.email,
        "preferencias": json.loads(t.preferencias or "{}")
    }

@app.put("/api/teachers/{tid}")
def update_teacher(tid: int, req: TeacherUpdate, db: Session = Depends(get_db)):
    t = db.query(Teacher).get(tid)
    if not t:
        raise HTTPException(404, "Docente no encontrado")
    
    if req.nombre: t.nombre = req.nombre
    if req.email: t.email = req.email
    if req.password:
        from passlib.hash import bcrypt
        t.password_hash = bcrypt.hash(req.password)
    if req.preferencias: t.preferencias = json.dumps(req.preferencias)
    
    db.commit()
    return {"ok": True, "nombre": t.nombre, "email": t.email}


@app.post("/api/auth/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(
        Teacher.email == req.email, Teacher.activo == True
    ).first()
    if not teacher:
        raise HTTPException(401, "Credenciales incorrectas")
    from passlib.hash import bcrypt
    if not bcrypt.verify(req.password, teacher.password_hash):
        raise HTTPException(401, "Credenciales incorrectas")
    return {
        "id":           teacher.id,
        "nombre":       teacher.nombre,
        "email":        teacher.email,
        "preferencias": json.loads(teacher.preferencias or "{}"),
    }


# ── SUBJECTS ──────────────────────────────────────────────────────────────────

class SubjectReq(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    docente_id: int


@app.get("/api/subjects")
def list_subjects(docente_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Subject).filter(Subject.activa == True)
    if docente_id:
        q = q.filter(Subject.docente_id == docente_id)
    return [{"id": s.id, "nombre": s.nombre, "codigo": s.codigo,
             "descripcion": s.descripcion, "docente_id": s.docente_id} for s in q.all()]


@app.post("/api/subjects", status_code=201)
def create_subject(req: SubjectReq, db: Session = Depends(get_db)):
    s = Subject(**req.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "nombre": s.nombre}


@app.delete("/api/subjects/{sid}")
def delete_subject(sid: int, db: Session = Depends(get_db)):
    s = db.query(Subject).get(sid)
    if not s:
        raise HTTPException(404, "Materia no encontrada")
    s.activa = False; db.commit()
    return {"ok": True}


# ── GROUPS ────────────────────────────────────────────────────────────────────

class GroupReq(BaseModel):
    nombre: str
    materia_id: int
    docente_id: int
    semestre: Optional[str] = None


@app.get("/api/groups")
def list_groups(docente_id: Optional[int] = None, materia_id: Optional[int] = None,
                db: Session = Depends(get_db)):
    q = db.query(Group).filter(Group.activo == True)
    if docente_id:
        q = q.filter(Group.docente_id == docente_id)
    if materia_id:
        q = q.filter(Group.materia_id == materia_id)
    result = []
    for g in q.all():
        count = db.query(GroupStudent).filter(
            GroupStudent.grupo_id == g.id, GroupStudent.activo == True
        ).count()
        result.append({
            "id": g.id, "nombre": g.nombre, "semestre": g.semestre,
            "materia_id": g.materia_id,
            "materia_nombre": g.materia.nombre if g.materia else None,
            "docente_id": g.docente_id,
            "estudiantes_count": count,
        })
    return result


@app.post("/api/groups", status_code=201)
def create_group(req: GroupReq, db: Session = Depends(get_db)):
    g = Group(**req.model_dump())
    db.add(g); db.commit(); db.refresh(g)
    return {"id": g.id, "nombre": g.nombre}


@app.delete("/api/groups/{gid}")
def delete_group(gid: int, db: Session = Depends(get_db)):
    g = db.query(Group).get(gid)
    if not g:
        raise HTTPException(404, "Grupo no encontrado")
    g.activo = False; db.commit()
    return {"ok": True}


@app.get("/api/groups/{gid}/students")
def group_students(gid: int, db: Session = Depends(get_db)):
    gs = db.query(GroupStudent).filter(
        GroupStudent.grupo_id == gid, GroupStudent.activo == True
    ).all()
    return [{"id": x.estudiante.id, "nombre": x.estudiante.nombre,
             "apellido": x.estudiante.apellido,
             "codigo_estudiante": x.estudiante.codigo_estudiante,
             "foto_path": x.estudiante.foto_path} for x in gs]


class AddStudentReq(BaseModel):
    estudiante_id: int


@app.post("/api/groups/{gid}/students")
def add_to_group(gid: int, req: AddStudentReq, db: Session = Depends(get_db)):
    existing = db.query(GroupStudent).filter(
        GroupStudent.grupo_id == gid,
        GroupStudent.estudiante_id == req.estudiante_id
    ).first()
    if existing:
        existing.activo = True
    else:
        db.add(GroupStudent(grupo_id=gid, estudiante_id=req.estudiante_id))
    db.commit()
    return {"ok": True}


@app.delete("/api/groups/{gid}/students/{sid}")
def remove_from_group(gid: int, sid: int, db: Session = Depends(get_db)):
    gs = db.query(GroupStudent).filter(
        GroupStudent.grupo_id == gid, GroupStudent.estudiante_id == sid
    ).first()
    if gs:
        gs.activo = False; db.commit()
    return {"ok": True}


# ── STUDENTS ──────────────────────────────────────────────────────────────────

class StudentReq(BaseModel):
    nombre: str
    apellido: str
    codigo_estudiante: Optional[str] = None


@app.get("/api/students")
def list_students(db: Session = Depends(get_db)):
    students = db.query(Student).filter(Student.activo == True).all()
    return [{
        "id": s.id, "nombre": s.nombre, "apellido": s.apellido,
        "codigo_estudiante": s.codigo_estudiante,
        "foto_path": s.foto_path, "face_label_id": s.face_label_id,
        "tiene_rostro": s.face_label_id is not None,
    } for s in students]


@app.post("/api/students", status_code=201)
def create_student(req: StudentReq, db: Session = Depends(get_db)):
    existing = None
    if req.codigo_estudiante:
        existing = db.query(Student).filter(
            Student.codigo_estudiante == req.codigo_estudiante
        ).first()
        
        if existing and existing.activo:
            raise HTTPException(400, "Código de estudiante ya existe activo")

    # Si existe pero fue "eliminado", lo revivimos para reciclar su ID
    if existing and not existing.activo:
        existing.nombre = req.nombre
        existing.apellido = req.apellido
        existing.activo = True
        db.commit()
        db.refresh(existing)
        Path(f"data/students/{existing.face_label_id}").mkdir(parents=True, exist_ok=True)
        return {"id": existing.id, "nombre": existing.nombre, "face_label_id": existing.face_label_id}

    existing_labels = [x[0] for x in db.query(Student.face_label_id)
                       .filter(Student.face_label_id.isnot(None)).all()]
    next_label = (max(existing_labels) + 1) if existing_labels else 1

    s = Student(nombre=req.nombre, apellido=req.apellido,
                codigo_estudiante=req.codigo_estudiante, face_label_id=next_label)
    db.add(s); db.commit(); db.refresh(s)
    Path(f"data/students/{next_label}").mkdir(parents=True, exist_ok=True)
    return {"id": s.id, "nombre": s.nombre, "face_label_id": s.face_label_id}


@app.delete("/api/students/{sid}")
def delete_student(sid: int, db: Session = Depends(get_db)):
    s = db.query(Student).get(sid)
    if not s:
        raise HTTPException(404, "Estudiante no encontrado")
    s.activo = False; db.commit()
    students = db.query(Student).filter(Student.activo == True).all()
    face_engine.update_label_map(students)
    return {"ok": True}


@app.get("/api/students/{sid}/capture-status")
def capture_status(sid: int, db: Session = Depends(get_db)):
    s = db.query(Student).get(sid)
    if not s:
        raise HTTPException(404, "Estudiante no encontrado")
    folder = Path(f"data/students/{s.face_label_id}")
    count  = len(list(folder.glob("*.jpg"))) if folder.exists() else 0
    return {"student_id": sid, "fotos": count, "listo": count >= 30}


# ── ATTENDANCE SESSIONS ───────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    grupo_id: int
    docente_id: int = 1

@app.get("/api/attendance/sessions")
def list_sessions(grupo_id: Optional[int] = None, docente_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(AttendanceSession)
    if grupo_id:
        q = q.filter(AttendanceSession.grupo_id == grupo_id)
    if docente_id:
        q = q.filter(AttendanceSession.docente_id == docente_id)
    
    sessions = q.order_by(AttendanceSession.fecha.desc(), AttendanceSession.id.desc()).limit(100).all()
    return [{
        "id": s.id,
        "materia": s.grupo.materia.nombre if s.grupo and s.grupo.materia else "Desconocida",
        "materia_id": s.grupo.materia_id if s.grupo else None,
        "grupo": s.grupo.nombre if s.grupo else "A",
        "grupo_id": s.grupo_id,
        "fecha": s.fecha,
        "estado": s.estado,
        "presentes": len([r for r in s.registros if r.estado == 'presente']),
        "total_registros": len(s.registros)
    } for s in sessions]

@app.post("/api/attendance/sessions", status_code=201)
def create_session(grupo_id: int, docente_id: int = 1, db: Session = Depends(get_db)):
    """Crea una nueva sesión o devuelve la activa de hoy para ese grupo."""
    try:
        today = date.today().isoformat()
        
        # Buscar sesión activa hoy para este grupo
        existing = db.query(AttendanceSession).filter(
            AttendanceSession.grupo_id == grupo_id,
            AttendanceSession.fecha == today,
            AttendanceSession.estado == "activa"
        ).first()
        
        if existing:
            return {
                "id": existing.id,
                "materia": existing.grupo.materia.nombre if existing.grupo and existing.grupo.materia else "Desconocida",
                "grupo": existing.grupo.nombre if existing.grupo else "A",
                "fecha": existing.fecha,
                "estado": existing.estado
            }
            
        # Si no existe, crearla
        new_s = AttendanceSession(
            grupo_id=grupo_id,
            docente_id=docente_id,
            fecha=today,
            estado="activa"
        )
        db.add(new_s); db.commit(); db.refresh(new_s)
        
        return {
            "id": new_s.id,
            "materia": new_s.grupo.materia.nombre if new_s.grupo and new_s.grupo.materia else "Desconocida",
            "grupo": new_s.grupo.nombre if new_s.grupo else "A",
            "fecha": new_s.fecha,
            "estado": new_s.estado
        }
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR AL CREAR SESIÓN: {e}")
        raise HTTPException(500, detail=str(e))

@app.delete("/api/attendance/sessions/{sid}")
def delete_session(sid: int, db: Session = Depends(get_db)):
    sess = db.query(AttendanceSession).get(sid)
    if not sess:
        raise HTTPException(404, "Sesión no encontrada")
    
    # Borrar registros primero
    db.query(AttendanceRecord).filter(AttendanceRecord.sesion_id == sid).delete()
    db.delete(sess)
    db.commit()
    return {"ok": True}


@app.get("/api/attendance/sessions/{sid}/records")
def session_records(sid: int, db: Session = Depends(get_db)):
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.sesion_id == sid
    ).all()
    return [{
        "id": r.id, "estudiante_id": r.estudiante_id,
        "nombre": f"{r.estudiante.nombre} {r.estudiante.apellido}" if r.estudiante else None,
        "hora": r.hora.isoformat() if r.hora else None,
        "confianza": r.confianza, "tipo_marca": r.tipo_marca, "estado": r.estado,
    } for r in records]


@app.get("/api/attendance/today")
def today_summary(docente_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = date.today().isoformat()
    q = db.query(AttendanceSession).filter(AttendanceSession.fecha == today)
    if docente_id:
        q = q.filter(AttendanceSession.docente_id == docente_id)
    sessions = q.all()
    presentes = sum(len([r for r in s.registros if r.estado == "presente"]) for s in sessions)
    ausentes  = sum(len([r for r in s.registros if r.estado == "ausente"])  for s in sessions)
    return {"fecha": today, "sesiones": len(sessions),
            "presentes": presentes, "ausentes": ausentes}


# ── EXPORT ────────────────────────────────────────────────────────────────────

@app.get("/api/export/excel")
def export_excel(session_id: Optional[int] = None, grupo_id: Optional[int] = None,
                 db: Session = Depends(get_db)):
    path = export_manager.export_excel(db, session_id=session_id, grupo_id=grupo_id)
    return FileResponse(path, filename="asistencia.xlsx",
                        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.get("/api/export/csv")
def export_csv(session_id: Optional[int] = None, grupo_id: Optional[int] = None,
               db: Session = Depends(get_db)):
    path = export_manager.export_csv(db, session_id=session_id, grupo_id=grupo_id)
    return FileResponse(path, filename="asistencia.csv", media_type="text/csv")


# ── TRAINING ──────────────────────────────────────────────────────────────────

@app.get("/api/training/status")
def get_training_status():
    return training_status


@app.post("/api/training/start")
async def start_training(bg: BackgroundTasks, db: Session = Depends(get_db)):
    if training_status["is_training"]:
        raise HTTPException(409, "Entrenamiento en progreso")

    def do_train():
        global training_status
        training_status = {"is_training": True, "message": "Entrenando…", "progress": 10}
        ok, msg = face_engine.train_model()
        if ok:
            _db = next(get_db())
            try:
                all_sts = _db.query(Student).filter(Student.activo == True).all()
                face_engine.update_label_map(all_sts)
            finally:
                _db.close()
        training_status = {"is_training": False, "message": msg, "progress": 100}

    bg.add_task(do_train)
    return {"ok": True}


# ── WEBSOCKET: SCANNER (RECIBE FRAMES) ────────────────────────────────────────

@app.websocket("/ws/scanner")
async def ws_scanner(ws: WebSocket, session_id: int, umbral: int = 75):
    await ws.accept()
    db = next(get_db())
    session = db.query(AttendanceSession).get(session_id)
    if not session:
        await ws.send_json({"error": "Sesión no encontrada"})
        await ws.close(); db.close(); return

    try:
        while True:
            # 1. Recibir frame base64 del cliente
            data = await ws.receive_json()
            frame_b64 = data.get("frame")
            if not frame_b64: continue

            # 2. Decodificar y procesar
            img_data = base64.b64decode(frame_b64.split(",")[-1])
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None: continue

            results = face_engine.detect_and_recognize(frame, umbral=umbral)
            
            # Anotamos el frame para devolverlo con feedback visual
            annotated = face_engine.draw_results(frame.copy(), results)
            res_b64 = face_engine.encode_frame(annotated)

            new_records = []
            for r in results:
                if r["reconocido"] and r["student_info"]:
                    sid = r["student_info"]["id"]
                    try:
                        exists = db.query(AttendanceRecord).filter(
                            AttendanceRecord.sesion_id == session_id,
                            AttendanceRecord.estudiante_id == sid,
                        ).first()
                        
                        if not exists:
                            rec = AttendanceRecord(
                                sesion_id=session_id, 
                                estudiante_id=sid,
                                confianza=r["confianza"], 
                                tipo_marca="entrada", 
                                estado="presente"
                            )
                            db.add(rec); db.commit(); db.refresh(rec)
                            
                            new_records.append({
                                "student_id": sid,
                                "nombre": r["student_info"]["nombre"],
                                "confianza": r["confianza"],
                            })
                            print(f"✅ ASISTENCIA: {r['student_info']['nombre']}")
                    except Exception as e:
                        db.rollback()
                        print(f"❌ ERROR: {e}")

            # 3. Responder con el frame procesado y los datos
            await ws.send_json({
                "frame": res_b64,
                "detections": results,
                "new_records": new_records,
            })

    except WebSocketDisconnect:
        pass
    finally:
        db.close()


# ── WEBSOCKET: CAPTURA DE ROSTRO (RECIBE FRAMES) ──────────────────────────────

@app.websocket("/ws/capture/{face_label_id}")
async def ws_capture(ws: WebSocket, face_label_id: int):
    await ws.accept()
    count = 0
    total = 30 # Reducimos a 30 para que sea más rápido para el usuario
    try:
        while count < total:
            data = await ws.receive_json()
            frame_data = data.get("frame")
            if not frame_data:
                continue
            
            # Guardar el frame recibido (encriptado automáticamente por el motor)
            # face_engine.process_and_save_frame maneja la detección y encriptación
            res = face_engine.process_and_save_frame(face_label_id, frame_data, count)
            if "error" not in res and res.get("status") == "captured":
                count += 1
                progress = int((count / total) * 100)
                # Feedback al frontend: Enviamos el mismo frame o uno con anotaciones si fuera necesario
                # Aquí enviamos solo metadatos para optimizar ancho de banda
                await ws.send_json({
                    "count": count,
                    "total": total,
                    "progress": progress,
                    "frame": frame_data.split(",")[-1] if "," in frame_data else frame_data
                })
        
        # Una vez capturados los frames, disparamos el entrenamiento
        await ws.send_json({"training": True, "message": "Iniciando entrenamiento…"})
        
        # Ejecutar entrenamiento (pesado) en un executor para no bloquear el loop de eventos
        loop = asyncio.get_running_loop()
        ok, msg = await loop.run_in_executor(None, face_engine.train_model)
        
        if ok:
            # Actualizar el mapa de etiquetas en memoria
            _db = next(get_db())
            try:
                all_sts = _db.query(Student).filter(Student.activo == True).all()
                face_engine.update_label_map(all_sts)
            finally:
                _db.close()
            
            await ws.send_json({"completed": True, "message": "Modelo reentrenado con éxito."})
        else:
            await ws.send_json({"error": f"Error en entrenamiento: {msg}"})

    except WebSocketDisconnect:
        print(f"WebSocket desconectado durante captura del ID {face_label_id}")
    except Exception as e:
        print(f"Error en ws_capture: {e}")
        try:
            await ws.send_json({"error": str(e)})
        except:
            pass
