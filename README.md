
# Chat Viewer Services

Visualizador web para explorar, auditar y exportar las conversaciones de los asistentes **Granville**, **Fortecar** y **Pampawagen** almacenadas en MongoDB.

---

## 1. Descripción general

Chat Viewer Services permite:

* Auditar la calidad de las respuestas de cada asistente.
* Analizar interacciones por cliente (número de teléfono) o rango de fechas.
* Exportar conversaciones filtradas en formato JSON para reportes o fine-tuning de LLMs.

### Capturas de pantalla conceptuales

> **Pantalla principal**
> Mostrador de tarjetas con acceso rápido a cada asistente.

> **Panel de filtros**
> Dropdowns para asistente, teléfono, fechas, texto libre y ordenamiento.

> **Vista de conversación**
> Burbujas de usuario y asistente con colores distintivos, contador de mensajes y botón **Volver al menú principal**.

> **Exportar**
> Botón _Exportar conversaciones_ que descarga un JSON con los filtros aplicados.

*(Agrega tus propias imágenes PNG a `/public/img` si deseas material gráfico real).*

---

## 2. Instalación y configuración

### 2.1 Requisitos

| Herramienta | Versión recomendada |
| ----------- | -------------------- |
| Node.js     | ≥ 18.x              |
| npm         | ≥ 9.x               |
| MongoDB     | Atlas 6.x o local    |

### 2.2 Clonar el repositorio

```bash
git clone https://github.com/DMGSys/chat-viewer-services.git
cd chat-viewer-services
```

### 2.3 Variables de entorno

1. Copia el archivo de ejemplo:

```bash
cp sample.env .env
```

2. Completa los valores:

```
PORT=3003
SECRETORPRIVATEKEY="cambia_esto"
MONGODB_URI="mongodb+srv://usuario:pass@cluster.mongodb.net/Agendamientos"
```

> **Pro-tip:** nunca subas `.env` a Git.

### 2.4 Instalar dependencias

```bash
npm install
```

### 2.5 Ejecución

Modo desarrollo (hot-reload):

```bash
npm run dev
```

Modo producción:

```bash
npm start
```

Abre `http://localhost:3003`.

---

## 3. Estructura de la base de datos

### 3.1 Colecciones

| Colección       | Asistente  |
| ---------------- | ---------- |
| `asistente`    | Granville  |
| `asistente_fc` | Fortecar   |
| `asistente_pw` | Pampawagen |

### 3.2 Documento ejemplo (`asistente_pw`)

```json
{
  "_id": ObjectId("683742c903bf44233fb910e4"),
  "sessionId": "5492302412844",
  "messages": [
    {
      "type": "human",
      "data": { "content": "Hola cómo estás?", ... },
      "timestamp": ISODate("2025-05-28T17:07:20.968Z")
    },
    {
      "type": "ai",
      "data": { "content": "Hola, soy Martina...", ... },
      "timestamp": ISODate("2025-05-28T17:07:21.067Z")
    }
  ]
}
```

Campos clave:

* `sessionId` → número de teléfono (identificador de conversación).
* `messages[]`
  * `type`: `"human"` o `"ai"`.
  * `data.content`: texto del mensaje.
  * `timestamp`: fecha ISO.

### 3.3 Índices sugeridos

```bash
db.asistente_pw.createIndex({ sessionId: 1 })
db.asistente_pw.createIndex({ "messages.timestamp": -1 })
db.asistente_pw.createIndex({ "messages.data.content": "text" })
```

---

## 4. Manual de usuario

| Función                        | Descripción                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| **Selector de asistente** | Dropdown para Granville, Fortecar, Pampawagen.                                       |
| **Filtro por teléfono**  | Lista de `sessionId` únicos.                                                      |
| **Rango de fechas**       | Calendario_desde/hasta_.                                                           |
| **Búsqueda de texto**    | Coincidencias en el contenido de mensajes.                                           |
| **Ordenar**               | Por fecha o teléfono (asc/desc).                                                    |
| **Exportar**              | Descarga JSON filtrado.                                                              |
| **Navegación**           | Botones_Volver al menú principal_ en header, fin de chat y panel de exportación. |
| **Responsive**            | Se adapta a móvil/escritorio (CSS Flexbox).                                         |

---

## 5. Guía de solución de problemas

| Problema                           | Causa común                             | Solución                                                             |
| ---------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| `Error: MONGODB_URI not defined` | Falta `.env`                           | Crear `.env` con la URI correcta.                                   |
| `ECONNREFUSED` al iniciar        | Puerto ocupado                           | Cambia `PORT` en `.env` o libera el 3003.                         |
| Página de error `db_connection` | URI inválida, IP no autorizada en Atlas | Verifica usuario, contraseña y lista blanca de IPs en MongoDB Atlas. |
| Vacío sin chats                   | Colección incorrecta o sin datos        | Confirma nombres de colección y que existan documentos.              |

---

## 6. Desarrollo y contribución

### 6.1 Scripts npm

| Comando         | Acción                      |
| --------------- | ---------------------------- |
| `npm start`   | Inicia en modo producción   |
| `npm run dev` | Arranca con**nodemon** |
| `npm test`    | Lugar para tests futuros     |

### 6.2 Guía de contribución

1. **Fork** y crea una rama `feature/<nombre>`.
2. Sigue el estándar **Conventional Commits** (`feat:`, `fix:`…).
3. Pull Request con descripción clara y _screenshots_ si aplica.
4. ESLint y Prettier pasarán antes del merge.

### 6.3 Mejores prácticas

* Variables de entorno via `dotenv`.
* Código formateado con **Prettier**.
* Mantener lógica de acceso a datos en `services/`.
* Usar promesas async/await y manejar errores con `try/catch`.

---

## 7. Arquitectura y decisiones técnicas

* **Express + EJS**: simplicidad, cero build-step.
* **MongoDB Native Driver**: consultas avanzadas sin ODM.
* **Diseño MVC ligero**
  * _Routes_ → controladores HTTP.
  * _Services_ → acceso a datos.
  * _Views_ → EJS + CSS.
* **Bootstrap-like css custom** para evitar dependencias pesadas.
* Soporte **Dockerfile** minimal para despliegue containerizado.
* Middleware verifica salud de la DB antes de atender la petición.

---

## 8. Historial de versiones

| Fecha      | Versión | Cambios destacados                                           |
| ---------- | -------- | ------------------------------------------------------------ |
| 2025-05-31 | 1.0.0    | Versión inicial con listado y filtros básicos.             |
| 2025-06-01 | 1.1.0    | Conexión a MongoDB Atlas, UI responsiva, exportación JSON. |
| 2025-06-01 | 1.2.0    | Navegación mejorada, manejo de errores, README ampliado.    |

---

## 9. Licencia y atribuciones

**MIT License**

```
Copyright (c) 2025 Diego Gatica

Se concede permiso por la presente, libre de cargos, a cualquier persona que obtenga
una copia de este software y archivos de documentación asociados...
```

Ver archivo `LICENSE` para el texto completo.

### Agradecimientos

* [MongoDB](https://www.mongodb.com/) por su driver.
* FontAwesome por los íconos.
* La comunidad **Open Source**.

---

## 10. Roadmap

* [ ] Paginación en la lista de chats.
* [ ] Descarga en CSV.
* [ ] Autenticación con roles (admin/consulta).
* [ ] Gráficos de métricas (mensajes por día, satisfacción).
* [ ] Tests unitarios con Jest y cobertura CI.
* [ ] Docker Compose con base de datos de ejemplo.
* [ ] Dark mode.

> _¿Tienes ideas? Abre un issue o discútelo en un Pull Request._

---
