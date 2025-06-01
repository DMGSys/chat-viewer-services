require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos desde el directorio public
app.use(express.static(path.join(__dirname, "public")));

// Configurar rutas de chat
const chatRoutes = require("./routes/chatsRoute");
app.use("/chats", chatRoutes);

// Redireccionar la ruta raíz a la ruta de chats
app.get("/", (req, res) => {
  // Redireccionar a la colección predeterminada de chats
  res.redirect("/chats/mensajes");
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).render("index", { 
    mensaje: "Página no encontrada", 
    chats: [],
    error: "La ruta solicitada no existe."
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado en http://localhost:${PORT}`);
  console.log(`📱 Visor de chats disponible en: http://localhost:${PORT}/chats/mensajes`);
});
