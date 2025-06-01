require("dotenv").config();
const express = require("express");
const path = require("path");
const { verificarConexion } = require("./services/mongoService");

const app = express();
const PORT = process.env.PORT || 3003;

// Verificar variables de entorno críticas
if (!process.env.MONGODB_URI) {
  console.error("❌ ERROR: Variable de entorno MONGODB_URI no definida. Verifique su archivo .env");
  process.exit(1);
}

// Configuración de Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Middleware para verificar la conexión a MongoDB
app.use(async (req, res, next) => {
  if (req.path === '/error') return next();
  
  try {
    const conexionExitosa = await verificarConexion();
    if (!conexionExitosa) {
      console.error("❌ Error de conexión a MongoDB detectado en middleware");
      return res.redirect('/error?msg=db_connection');
    }
    next();
  } catch (error) {
    console.error("❌ Error en middleware de verificación:", error.message);
    return res.redirect('/error?msg=db_connection');
  }
});

// Rutas de la aplicación
const chatRoutes = require("./routes/chatsRoute");
app.use("/chats", chatRoutes);

// Ruta para errores de conexión
app.get("/error", (req, res) => {
  const msg = req.query.msg || 'unknown';
  let mensaje = "Error desconocido";
  
  if (msg === 'db_connection') {
    mensaje = "Error de conexión a la base de datos. Verifique su archivo .env y la conexión a MongoDB.";
  }
  
  res.status(500).render("index", { 
    mensaje: "❌ Error en Chat Viewer", 
    chats: [],
    error: mensaje
  });
});

// Redireccionar la ruta raíz a la colección predeterminada de chats (asistente_pw)
app.get("/", (req, res) => {
  res.redirect("/chats/asistente_pw");
});

// Manejar rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).render("index", { 
    mensaje: "Página no encontrada", 
    chats: [],
    error: "La ruta solicitada no existe."
  });
});

// Iniciar el servidor
const server = app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Servidor Express iniciado en http://localhost:${PORT}`);
  console.log(`📱 Visor de chats disponible en: http://localhost:${PORT}/chats/asistente_pw`);
  console.log(`📊 Colecciones disponibles:`);
  console.log(`   - http://localhost:${PORT}/chats/asistente_pw (Pampawagen)`);
  console.log(`   - http://localhost:${PORT}/chats/asistente_fc (Fortecar)`);
  console.log(`   - http://localhost:${PORT}/chats/asistente (Granville)`);
  console.log(`💾 Usando base de datos: ${process.env.MONGODB_URI.split('@')[1].split('/')[0]}`);
  console.log("=".repeat(50));
});

// Manejar errores del servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ERROR: El puerto ${PORT} ya está en uso. Intente con otro puerto.`);
  } else {
    console.error(`❌ ERROR del servidor:`, error.message);
  }
  process.exit(1);
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log("\n👋 Cerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor cerrado correctamente");
    process.exit(0);
  });
});
