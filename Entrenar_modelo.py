import cv2
import numpy as np
from PIL import Image
import os

print("Iniciando el proceso de entrenamiento del modelo de reconocimiento facial...")

path = 'data'

recognizer_output_file = 'modelo_reconocimiento.yml'

face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

if face_cascade.empty():
    print("ERROR: No se pudo cargar el clasificador de rostro (haarcascade_frontalface_default.xml)")
    print("Asegurate de que el archivo este en la carpeta de este scritp o la ruta sea correcta")
    exit()
print("Clasificar de rostro cargado correctamente para el preprocesamiento")

recognizer = cv2.face.LBPHFaceRecognizer_create()

def get_images_and_labels(path):
    image_paths = []
    labels = []

    for root, dirs, files in os.walk(path):
        for dir_name in dirs:
            if dir_name.isdigit():
              label = int(dir_name)
              person_folder = os.path.join(root, dir_name)
    
              for file_name in os.listdir(person_folder):
                  if file_name.lower().endswith((".jpg",".png")):
                      image_path = os.path.join(person_folder,file_name)
                      image_paths.append(image_path)
                      labels.append(label)
   
            else:
                print(f"Ignorando carpeta no numerica en '{root}: '{dir}")
    face_simple = []
    ids = []

    print(f"Encontradas {len(image_paths)} imagenes para procesar. ")   
    
    for image_path, label in zip(image_paths, labels):

        try:
            pil_imagen = Image.open(image_path).convert('L')
            image_numpy = np.array(pil_imagen, 'uint8')


            faces = face_cascade.detectMultiScale(image_numpy)

            for (x, y, w, h) in faces:
                face_simple.append(image_numpy[y:y+h, x:x+w])
                ids.append(label)
        except Exception as e:
            print(f"Error procesando la imagen {image_path}: {e}")
            continue
    return face_simple, np.array(ids)

print("Recolectando imagenes y etiquetas...")

faces,ids = get_images_and_labels(path)

if len(faces) == 0:
    print("Error, no se encontraron rostros validos para el entrenamiento. Asegurate que la carpeta 'data' contenga subcarpetas con imagenes y rostros. ")
    exit()
    
print(f"Iniciando el entrenamiento con {len(faces)} rostros de {len(np.unique(ids))} IDs unicos.")
print("Este proceso puede tardas unos minutos dependiendo de la cantidasd de imagenes.")

recognizer.train(faces, ids)

recognizer.write(recognizer_output_file)

print(f"\nModelo entrenado exitoxamente y guardado como '{recognizer_output_file}'")
