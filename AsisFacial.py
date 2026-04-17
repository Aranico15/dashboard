import cv2
import time

print("Iniciando la camara y deteccion de rostros....")
print("Si desea SALIR presione q" )

face_cascade=cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

if face_cascade.empty():
    print("Error, no se pudo encontrar el clasificador de rostro")
    exit()
cap = cv2.VideoCapture(0)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)



if not cap.isOpened():
    print("Error, no se pudo sbrir la camara")
    exit()
while True:
    ret, frame = cap.read()

    if not ret:
        print("Error, no se pudo leer el fotograma. Saliendo")
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    

    face = face_cascade.detectMultiScale(gray, 1.1 , 4)

    for (x, y, w, h) in face:
        cv2.rectangle(frame, (x,y), (x+w, y+h), (0,255,0), 2) 

        cv2.imshow('Ventana de camara con detecccion facial', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("Has presionado la letra q, saliendo...")
        break

cap.release()
cv2.destroyAllWindows()
print("Camara cerrada y programa finalizado")