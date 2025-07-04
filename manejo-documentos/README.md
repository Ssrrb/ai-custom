# File Chatbot - Arquitectura de Procesamiento Basada en Pull desde GCS

Este proyecto implementa una arquitectura segura basada en `pull` para procesar archivos subidos a Google Cloud Storage (GCS) utilizando un worker local (on-premise). El diseño evita exponer puntos de conexión de red, ya que todas las conexiones se inician desde el worker hacia las APIs de Google Cloud.

## Descripción General de la Arquitectura

1.  **Cloud Storage**: Los archivos se suben a un bucket de GCS.
2.  **Eventarc**: Un evento de tipo `google.cloud.storage.object.v1.finalized` dispara una notificación.
3.  **Cloud Function**: Una función (`publish_to_pubsub`) recibe el evento, extrae los metadatos del archivo y los publica como un mensaje JSON en un tema de Pub/Sub.
4.  **Tema de Pub/Sub**: El tema `chatbot_documents` recibe los mensajes con los metadatos.
5.  **Worker On-premise**: Una aplicación de Python en un contenedor de Docker se suscribe al tema, obtiene los mensajes, descarga el archivo correspondiente desde GCS para su procesamiento y envía una confirmación (`acknowledgement`).

## Configuración y Despliegue

### Prerrequisitos

*   Docker y Docker Compose instalados.
*   Un proyecto de Google Cloud.

### 1. Configurar Variables de Entorno

Crea un archivo `.env` dentro de la carpeta `worker` con las siguientes variables:

```bash
# worker/.env
SUBSCRIPTION_ID=chatbot_documents-sub
GCLOUD_PROJECT=analisis-de-licitaciones-mopc
TOPIC_ID=chatbot_documents
```

Adicionalmente, coloca el archivo de clave JSON de la cuenta de servicio dentro de la carpeta `worker/secrets`.

### 2. Recursos de GCP Utilizados

*   **Bucket**: `ai-demo-softshop`
*   **Topic**: `chatbot_documents`
*   **Subscription**: `chatbot_documents-sub`
*   **Cloud Function**: `publish_to_pubsub`
*   **Project**: `analisis-de-licitaciones-mopc`

### 3. Ejecutar el Worker On-premise

Una vez que los recursos estén desplegados y el archivo de credenciales (`worker/secrets/key.json`) esté en su lugar:

```bash
cd worker
docker-compose up --build
```

### 4. Probar el Flujo

Sube un archivo a tu bucket de GCS. Reemplaza `<tu-bucket-name>` con el nombre de tu bucket:

```bash
echo "hola mundo" > test.txt
gsutil cp test.txt gs://<tu-bucket-name>/
```

Deberías ver los logs en la Cloud Function y en la terminal de tu worker local, indicando que el mensaje fue recibido y procesado.

## Cloud Function: `publish_to_pubsub`

El proyecto incluye una Cloud Function responsable de conectar Google Cloud Storage y Pub/Sub.

### Disparador y Propósito

*   **Disparador**: La función se activa mediante un evento de Eventarc de tipo `google.cloud.storage.object.v1.finalized`, que se dispara cada vez que un nuevo archivo se sube con éxito o se sobrescribe uno existente en el bucket de GCS designado.
*   **Propósito**: Su función principal es capturar los metadatos del objeto de GCS recién creado y publicarlos como un mensaje estructurado en el tema de Pub/Sub `chatbot_documents`.

### Contenido del Mensaje (Payload)

La función construye un payload JSON con los siguientes pares clave-valor, que luego se envía a Pub/Sub:

```json
{
    "event_id": "...",
    "bucket": "tu-bucket-name",
    "object": "ruta/a/tu/archivo.txt",
    "generation": "...",
    "size": 1234,
    "contentType": "text/plain",
    "timeCreated": "..."
}
```

### Configuración

La función se configura con las siguientes variables de entorno durante el despliegue:

*   `GCLOUD_PROJECT`: El ID de tu proyecto de Google Cloud.
*   `TOPIC_ID`: El ID del tema de Pub/Sub donde se publicarán los mensajes (ej. `chatbot_documents`).

## Detalles del Worker

El worker on-premise es una aplicación de Python que se ejecuta dentro de un contenedor de Docker. Sus principales responsabilidades son:

1.  **Suscripción a Pub/Sub**: El worker establece una conexión con una suscripción específica de Pub/Sub para escuchar los mensajes entrantes.
2.  **Procesamiento de Mensajes**: Por cada mensaje recibido, el worker realiza las siguientes acciones:
    *   Decodifica los datos del mensaje, que se espera que sea un payload JSON con las claves `bucket` y `object`.
    *   Llama a la función `process_file` para manejar la lógica de negocio.
3.  **Descarga de Archivos**: La función `process_file` descarga el archivo especificado desde Google Cloud Storage a un directorio local dentro del contenedor (`/app/files`).
4.  **Confirmaciones (Acknowledgements)**:
    *   Si el archivo se procesa con éxito, el worker envía una confirmación (`ack`) a Pub/Sub para eliminar el mensaje de la suscripción.
    *   Si el archivo no se encuentra en GCS (`404 Not Found`), el mensaje también se confirma para evitar bucles de reintentos con archivos inexistentes.
    *   Para otros tipos de errores (ej. JSON mal formado, excepciones inesperadas), el worker envía una confirmación negativa (`nack`), permitiendo que Pub/Sub intente reenviar el mensaje.

### Configuración

El worker se configura mediante variables de entorno definidas en `worker/docker-compose.yml` y cargadas desde el archivo `.env`:

*   `GCLOUD_PROJECT`: El ID de tu proyecto de Google Cloud.
*   `SUBSCRIPTION_ID`: El ID de la suscripción de Pub/Sub que el worker debe escuchar (ej. `chatbot_documents-sub`).
*   `GOOGLE_APPLICATION_CREDENTIALS`: La ruta al archivo de clave de la cuenta de servicio (`/app/secrets/key.json`), que se monta en el contenedor.

### Almacenamiento Local de Archivos

Los archivos descargados de GCS se guardan en el directorio `worker/files` en tu máquina local, que se mapea como un volumen al directorio `/app/files` dentro del contenedor del worker. Esto te permite acceder fácilmente a los archivos procesados.

### Pruebas
Subir un archivo desde el bucket de GCS ai-demo-softshop y revisar si el worker lo procesa correctamente lo almacenara dentro del directorio files
