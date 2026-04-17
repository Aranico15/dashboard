import base64
import os
import threading
import io
from pathlib import Path
from typing import Optional, List, Tuple

import cv2
import numpy as np
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

CASCADE_PATH   = "haarcascade_frontalface_default.xml"
MODELO_PATH    = "modelos/modelo_reconocimiento.yml"
DATA_PATH      = "data/students"
MASTER_PASS    = b"2026-USTA"  # Contraseña maestra para derivar la clave

class ImageEncryptor:
    """Maneja la encriptación y desencriptación de imágenes en disco."""
    def __init__(self, password: bytes):
        # Derivamos una clave determinista a partir de la contraseña maestra
        salt = b'usta_facial_salt_2026' # Salt fijo para que la clave sea la misma siempre
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        self.fernet = Fernet(key)

    def encrypt(self, data: bytes) -> bytes:
        return self.fernet.encrypt(data)

    def decrypt(self, encrypted_data: bytes) -> bytes:
        return self.fernet.decrypt(encrypted_data)

class FaceEngine:
    """Singleton que mantiene el clasificador y el reconocedor LBPH con soporte de encriptación."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._ready = False
        return cls._instance

    def initialize(self):
        self.cascade    = cv2.CascadeClassifier(CASCADE_PATH)
        self.recognizer = cv2.face.LBPHFaceRecognizer_create()
        self.encryptor  = ImageEncryptor(MASTER_PASS)
        self.model_loaded = False
        self.label_map: dict = {}
        self._train_lock = threading.Lock()
        self.is_training  = False

        if Path(MODELO_PATH).exists():
            try:
                self.recognizer.read(MODELO_PATH)
                self.model_loaded = True
                print(f"Modelo LBPH cargado con exito")
            except Exception as e:
                print(f"No se pudo cargar el modelo: {e}")

        self._ready = True

    def update_label_map(self, students):
        self.label_map = {s.face_label_id: {"id": s.id, "nombre": f"{s.nombre} {s.apellido}", "codigo": s.codigo_estudiante} 
                         for s in students if s.face_label_id is not None}
        print(f"Label map actualizado: {len(self.label_map)} estudiantes")

    def detect_and_recognize(self, frame, umbral: int = 75):
        results = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
        
        for (x, y, w, h) in faces:
            roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
            student_info = None
            confianza = None
            reconocido = False

            if self.model_loaded:
                try:
                    label, dist = self.recognizer.predict(roi)
                    conf_pct = max(0.0, min(100.0, 130.0 - dist))
                    if conf_pct >= umbral and label in self.label_map:
                        student_info = self.label_map[label]
                        confianza = round(conf_pct, 1)
                        reconocido = True
                except: pass

            results.append({
                "bbox": [int(x), int(y), int(w), int(h)],
                "reconocido": reconocido,
                "student_info": student_info,
                "confianza": confianza,
            })
        return results

    def draw_results(self, frame, results):
        for r in results:
            x, y, w, h = r["bbox"]
            color = (0, 220, 90) if r["reconocido"] else (50, 50, 255)
            label = f"{r['student_info']['nombre']} {r['confianza']}%" if r["reconocido"] else "Desconocido"
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            cv2.rectangle(frame, (x, y-30), (x+w, y), color, -1)
            cv2.putText(frame, label, (x+4, y-8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        return frame

    def train_model(self):
        """Re-entrena el modelo desencriptando imágenes en memoria."""
        with self._train_lock:
            self.is_training = True
            try:
                faces, ids = [], []
                data_root = Path(DATA_PATH)
                if not data_root.exists(): return False, "No hay datos"

                for folder in data_root.iterdir():
                    if not folder.is_dir() or not folder.name.isdigit(): continue
                    label = int(folder.name)
                    for img_file in folder.iterdir():
                        try:
                            # 1. Leer datos encriptados
                            encrypted_data = img_file.read_bytes()
                            # 2. Desencriptar
                            decrypted_data = self.encryptor.decrypt(encrypted_data)
                            # 3. Convertir a imagen OpenCV (grises)
                            nparr = np.frombuffer(decrypted_data, np.uint8)
                            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
                            
                            if img is not None:
                                faces.append(img)
                                ids.append(label)
                        except Exception as e:
                            print(f"⚠️ Error procesando {img_file}: {e}")

                if not faces: return False, "Sin rostros"

                rec = cv2.face.LBPHFaceRecognizer_create()
                rec.train(faces, np.array(ids))
                Path("modelos").mkdir(exist_ok=True)
                rec.write(MODELO_PATH)
                self.recognizer = rec
                self.model_loaded = True
                return True, f"Entrenado con {len(faces)} muestras"
            except Exception as e:
                return False, f"Error: {e}"
            finally:
                self.is_training = False

    def process_and_save_frame(self, face_label_id: int, frame_b64: str, count: int) -> dict:
        """Procesa un frame enviado desde el navegador, detecta rostro, lo encripta y lo guarda."""
        try:
            # 1. Decode base64
            img_data = base64.b64decode(frame_b64.split(",")[-1] if "," in frame_b64 else frame_b64)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None: return {"error": "Frame inválido"}

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))

            if len(faces) == 0:
                return {"status": "searching", "message": "No se detecta rostro"}

            # Tomar el rostro más grande
            (x, y, w, h) = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
            roi = cv2.resize(gray[y:y+h, x:x+w], (100, 100))
            
            # 2. Encriptar los bytes de la imagen (ROI)
            _, buf = cv2.imencode(".jpg", roi)
            encrypted_roi = self.encryptor.encrypt(buf.tobytes())

            # 3. Guardar en disco
            student_path = Path(DATA_PATH) / str(face_label_id)
            student_path.mkdir(parents=True, exist_ok=True)
            file_path = student_path / f"face_{count}.enc"
            file_path.write_bytes(encrypted_roi)

            return {"status": "captured", "count": count + 1}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def encode_frame(frame, quality: int = 60) -> str:
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return base64.b64encode(buf).decode("utf-8")

face_engine = FaceEngine()
