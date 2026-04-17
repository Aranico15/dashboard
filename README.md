# 🎓 USTA FaceAuth - Sistema de Asistencia Facial Inteligente (V2)

USTA FaceAuth es una plataforma profesional diseñada para automatizar el control de asistencia en entornos educativos utilizando Inteligencia Artificial avanzada (Reconocimiento Facial mediante LBPH) y seguridad criptográfica.

![Dashboard Preview](https://img.shields.io/badge/Status-Secured%20%26%20Portable-green)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20OpenCV-blue)
![Security](https://img.shields.io/badge/Encryption-AES%20Fernet-red)

## 🚀 Características Principales

- **Cámara Descentralizada**: El sistema ya no depende del hardware del servidor. Utiliza la cámara del navegador (PC, Tablet o Móvil) para capturar y enviar frames en tiempo real.
- **Biometría Encriptada**: Todas las imágenes de entrenamiento se cifran inmediatamente después de la captura.
- **Escáner Facial Dinámico**: Reconocimiento en tiempo real con más del 75% de confianza mínima configurada.
- **Gestión Integral**: Organización de materias, grupos y estudiantes con historial detallado de registros.
- **Modo Oscuro/Claro**: Interfaz premium diseñada para la mejor experiencia de usuario.

---

## 🔒 Motor de Encriptación y Seguridad

Para garantizar la privacidad de los datos biométricos de los estudiantes, el sistema implementa una capa de seguridad basada en:

- **Algoritmo**: **Fernet (AES-128 en modo CBC con HMAC-SHA256)**.
- **Cifrado en Origen**: Los frames recibidos del navegador se cifran antes de persistirse en el disco.
- **Archivos `.enc`**: Las fotos no son accesibles como imágenes JPG normales; se almacenan como blobs encriptados.
- **Procesamiento en RAM**: Durante el entrenamiento y reconocimiento, el sistema desencripta los datos directamente en un buffer de memoria; el texto plano nunca reside en el disco duro.
- **Clave Maestra**: Utiliza una derivación de clave predefinida (`2026-USTA`) para garantizar que solo este sistema pueda leer los datos.

---

## 🛠️ Requisitos del Sistema

- **Python 3.10+**: Motor de IA y Servidor de Datos.
- **Node.js 18+**: Interfaz de Usuario y Dashboard.
- **Cámara Web**: Acceso mediante permisos del navegador.

---

## 📦 Instalación

### 1. Clonar y Preparar
```bash
git clone <url-del-repositorio>
cd AsistenciaFacial
```

### 2. Configurar el Backend (Python)
Se recomienda utilizar un entorno virtual para aislar las dependencias:
```bash
# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate  # En Windows
source venv/bin/activate  # En Linux/Mac

# Instalar dependencias esenciales
pip install -r requirements.txt
```

### 3. Configurar el Frontend (Next.js)
```bash
cd dashboard
npm install
```

---

## 🏃 Ejecución

Para que el programa funcione correctamente, ambos servidores deben estar activos:

### **Opción A: Iniciar Backend (Servidor de IA)**
Desde la carpeta raíz del proyecto (con el venv activado):
```bash
python -m uvicorn backend.main:app --port 8000 --reload
```
*El servidor estará disponible en `http://localhost:8000`.*

### **Opción B: Iniciar Frontend (Panel del Docente)**
Desde la carpeta `dashboard`:
```bash
npm run dev
```
*Accede a la plataforma en `http://localhost:3000`.*

---

## 📖 Flujo de Trabajo

### **1. Registro de Estudiantes (Modo Seguro)**
- Ve a **Estudiantes > Nuevo Estudiante**.
- El navegador solicitará acceso a la cámara. **Otorga el permiso**.
- La IA capturará y encriptará las muestras faciales automáticamente.

### **2. Toma de Asistencia**
- Ve a **Escáner Facial**, selecciona tu materia y activa el escáner.
- El sistema procesará los frames enviados por el navegador y marcará la asistencia si la confianza es superior al umbral configurado.

### **3. Gestión de Datos**
- Los registros se guardan en una base de datos SQLite (`asistencia.db`) y se pueden exportar o visualizar en la sección de **Historial**.
- Para eliminar registros sensibles, se requerirá la clave de seguridad configurada.

---

© 2026 USTA FaceAuth Team. Desarrollado para la excelencia académica y seguridad de datos.
