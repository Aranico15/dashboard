import cv2
import os

guardar_todos_los_rostros = 'data'
id_persona = 0
num_muestras = 200

path = os.path.join(guardar_todos_los_rostros, str(id_persona))

if not os.path.exists(path):
    os.makedirs(path)
    print(f"Carpta '{path}' guardada para el id {id_persona}.")
else:
    print(f"Carpeta {path} ya existe. Se anadiran nuevas muestras o se remplazaran si tienen el mismo nombre. ")

face_cascade=cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
 
if face_cascade.empty():
    print("Error, no se pudo encontar el clasificador de rostro 'haarcascade_frontalface_default.xml'")
    print("Asegurate que este en la carpeta de este scritp o la ruta sea correcta.")
    exit()

print("Clasificador de rostro cargado correctamente.")

cap =cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error, no se pudo abrir la camara.")
    exit()
print(f"Preparando camara para {num_muestras} muestras para el id {id_persona}.")
print("Coloca tu rostro el el centro del recuadro verde y manten tu posicion.")
print("Presiona q para salir si lo deseas")

contador_muestras = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("Error no se pudo leer la imagen")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    face = face_cascade.detectMultiScale(gray, 1.1, 4)

    for (x, y, w, h) in face:
        cv2.rectangle(frame, (x,y), (x+w, y+h), (0,255,0), 2) 
        if contador_muestras < num_muestras:
           margin = 10
           x1 = max(0, x - margin)
           y1 = max(0, y - margin)
           x2 = min(gray.shape[1], x+w + margin)
           y2 = min(gray.shape[0], y+h + margin)

           face_roi = gray[y1:y2, x1:x2]

           if face_roi.shape[0] > 0 and face_roi.shape[1]>0:
               face_roi = cv2.resize(face_roi, (100,100))
               guaedan_imagen = os.path.join(path, f"{id_persona}_{contador_muestras}.jpg")
               cv2.imwrite(guaedan_imagen, face_roi)
               contador_muestras = contador_muestras + 1
               print(f"{contador_muestras}/{num_muestras} capturadas.")
           else:
              print("Todas las muestras capturadas, presione q para salir")
              break
        cv2.imshow(f"capturando muestras para id {id_persona}, presione q para salir", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
           print("Tecla q para salir")
           break
        
        if contador_muestras >= num_muestras:
            print("Numero de muestras capturadas correctamente, salienso.....")
            break
cap.release()
cv2.destroyAllWindows()
print("Captura demuestras finalizado")

   
   
