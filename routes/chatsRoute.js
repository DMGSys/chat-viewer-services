const express = require("express");
const router = express.Router();
const { obtenerChats } = require("../services/mongoService");

router.get("/:coleccion", async (req, res) => {
  const { coleccion } = req.params;
  const chats = await obtenerChats(coleccion);
  res.render("index", { mensaje: `📂 Chats de ${coleccion}`, chats });
});

module.exports = router;
