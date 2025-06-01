require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const chatRoutes = require("./routes/chatsRoute");
app.use("/chats", chatRoutes);

app.get("/", (req, res) => {
  res.render("index", { mensaje: "Bienvenido a Chat Viewer", chats: [] });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express iniciado en http://localhost:${PORT}`);
});
