"""
database.py - Modelos SQLAlchemy y configuración de SQLite
Universidad Santo Tomás - Sistema de Asistencia Facial
"""
import json
import datetime
from pathlib import Path
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, Boolean, ForeignKey, Text
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./asistencia.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── MODELOS ────────────────────────────────────────────────────────────────────

class Teacher(Base):
    __tablename__ = "teachers"
    id            = Column(Integer, primary_key=True, index=True)
    nombre        = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    preferencias  = Column(Text, default='{}')   # JSON
    activo        = Column(Boolean, default=True)
    creado_en     = Column(DateTime, default=datetime.datetime.utcnow)

    materias  = relationship("Subject", back_populates="docente")
    grupos    = relationship("Group",   back_populates="docente")
    sesiones  = relationship("AttendanceSession", back_populates="docente")


class Subject(Base):
    __tablename__ = "subjects"
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(200), nullable=False)
    codigo      = Column(String(50))
    descripcion = Column(Text)
    docente_id  = Column(Integer, ForeignKey("teachers.id"))
    activa      = Column(Boolean, default=True)
    creado_en   = Column(DateTime, default=datetime.datetime.utcnow)

    docente = relationship("Teacher",  back_populates="materias")
    grupos  = relationship("Group",    back_populates="materia")


class Group(Base):
    __tablename__ = "groups"
    id         = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String(100), nullable=False)
    materia_id = Column(Integer, ForeignKey("subjects.id"))
    docente_id = Column(Integer, ForeignKey("teachers.id"))
    semestre   = Column(String(20))
    activo     = Column(Boolean, default=True)
    creado_en  = Column(DateTime, default=datetime.datetime.utcnow)

    materia     = relationship("Subject",           back_populates="grupos")
    docente     = relationship("Teacher",           back_populates="grupos")
    estudiantes = relationship("GroupStudent",      back_populates="grupo")
    sesiones    = relationship("AttendanceSession", back_populates="grupo")


class Student(Base):
    __tablename__ = "students"
    id                = Column(Integer, primary_key=True, index=True)
    nombre            = Column(String(100), nullable=False)
    apellido          = Column(String(100), nullable=False)
    codigo_estudiante = Column(String(50),  unique=True)
    foto_path         = Column(String(500))
    face_label_id     = Column(Integer, unique=True)   # ID numérico para LBPH
    activo            = Column(Boolean, default=True)
    creado_en         = Column(DateTime, default=datetime.datetime.utcnow)

    grupos   = relationship("GroupStudent",    back_populates="estudiante")
    registros = relationship("AttendanceRecord", back_populates="estudiante")


class GroupStudent(Base):
    __tablename__ = "group_students"
    id            = Column(Integer, primary_key=True, index=True)
    grupo_id      = Column(Integer, ForeignKey("groups.id"))
    estudiante_id = Column(Integer, ForeignKey("students.id"))
    fecha_ingreso = Column(DateTime, default=datetime.datetime.utcnow)
    activo        = Column(Boolean, default=True)

    grupo      = relationship("Group",   back_populates="estudiantes")
    estudiante = relationship("Student", back_populates="grupos")


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    grupo_id      = Column(Integer, ForeignKey("groups.id"))
    docente_id    = Column(Integer, ForeignKey("teachers.id"))
    fecha         = Column(String(10))           # YYYY-MM-DD
    tipo          = Column(String(20), default="entrada")  # entrada|salida|ambas
    iniciada_en   = Column(DateTime, default=datetime.datetime.utcnow)
    finalizada_en = Column(DateTime, nullable=True)
    estado        = Column(String(20), default="activa")   # activa|cerrada

    grupo    = relationship("Group",   back_populates="sesiones")
    docente  = relationship("Teacher", back_populates="sesiones")
    registros = relationship("AttendanceRecord", back_populates="sesion")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id            = Column(Integer, primary_key=True, index=True)
    sesion_id     = Column(Integer, ForeignKey("attendance_sessions.id"))
    estudiante_id = Column(Integer, ForeignKey("students.id"))
    hora          = Column(DateTime, default=datetime.datetime.utcnow)
    confianza     = Column(Float)
    tipo_marca    = Column(String(20))               # entrada|salida
    estado        = Column(String(20), default="presente")  # presente|ausente|tardanza

    sesion     = relationship("AttendanceSession", back_populates="registros")
    estudiante = relationship("Student",           back_populates="registros")


# ── HELPERS ────────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea tablas e inserta el docente admin por defecto, y datos de prueba."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Teacher).count() == 0:
            prefs = {
                "tema": "oscuro",
                "umbral_confianza": 75,
                "tolerancia_tardanza": 10,
                "tipo_asistencia_default": "entrada"
            }
            # Hardcoded bcrypt hash para 'admin123' para evitar problemas de compatibilidad de passlib
            admin = Teacher(
                nombre="Admin UST",
                email="admin@ust.edu.co",
                password_hash="$2b$12$L8g.A0y26D3gE.p9h0sB/.U//C/A3M3qZ4e0q.k.B1p8p.B5g/.qB", # Hash real para admin123
                preferencias=json.dumps(prefs)
            )
            db.add(admin)
            db.commit()
            print("✅ Docente admin creado: admin@ust.edu.co / admin123")
            
            # Crear datos semilla para probar de inmediato
            from .database import Subject, Group, AttendanceSession
            materia = Subject(nombre="Ingeniería de Software", docente_id=admin.id)
            db.add(materia)
            db.commit()
            
            grupo = Group(nombre="Grupo A", materia_id=materia.id, docente_id=admin.id)
            db.add(grupo)
            db.commit()
            
            sesion = AttendanceSession(grupo_id=grupo.id, docente_id=admin.id, fecha=datetime.datetime.utcnow().date().isoformat())
            db.add(sesion)
            db.commit()
            print(f"✅ Sesión de prueba creada con ID: {sesion.id}")
            
    finally:
        db.close()
