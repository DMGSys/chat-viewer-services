const express = require("express");
const router = express.Router();
const { 
  obtenerChats, 
  obtenerSessionIds, 
  exportarHistorial,
  obtenerTiposAsistentes,
  verificarConexion
} = require("../services/mongoService");

/**
 * Ruta principal para obtener chats con filtros y ordenamiento
 * GET /chats/:coleccion
 */
router.get("/:coleccion", async (req, res) => {
  try {
    const { coleccion } = req.params;
    const { 
      asistente, 
      sessionId, 
      fechaInicio, 
      fechaFin, 
      busqueda,
      ordenarPor,
      direccion
    } = req.query;

    // Verificar conexión a la base de datos
    const conexionExitosa = await verificarConexion();
    if (!conexionExitosa) {
      throw new Error("No se pudo conectar a la base de datos. Verifique su archivo .env y la conexión a MongoDB.");
    }

    // Construir objeto de filtros
    const filtros = {};
    if (asistente) filtros.asistente = asistente;
    if (sessionId) filtros.sessionId = sessionId;
    if (fechaInicio) filtros.fechaInicio = fechaInicio;
    if (fechaFin) filtros.fechaFin = fechaFin;
    if (busqueda) filtros.busqueda = busqueda;

    // Configurar ordenamiento
    const ordenamiento = {
      campo: ordenarPor || "fecha",
      direccion: direccion === "asc" ? 1 : -1
    };

    // Obtener chats filtrados
    const chats = await obtenerChats(coleccion, filtros, ordenamiento);
    
    // Obtener datos para los dropdowns
    const sessionIds = await obtenerSessionIds(coleccion);
    const tiposAsistentes = await obtenerTiposAsistentes(coleccion);
    
    // Renderizar vista con datos
    res.render("index", { 
      mensaje: `📂 Chats de ${coleccion}`, 
      chats,
      filtros,
      sessionIds,
      tiposAsistentes,
      coleccion
    });
  } catch (error) {
    console.error("❌ Error en ruta de chats:", error);
    res.status(500).render("index", { 
      mensaje: "Error al cargar chats", 
      chats: [],
      error: error.message
    });
  }
});

/**
 * API para obtener sessionIds únicos
 * GET /chats/:coleccion/sessionids
 */
router.get("/:coleccion/sessionids", async (req, res) => {
  try {
    const { coleccion } = req.params;
    const sessionIds = await obtenerSessionIds(coleccion);
    res.json(sessionIds);
  } catch (error) {
    console.error("❌ Error obteniendo sessionIds:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API para obtener tipos de asistentes
 * GET /chats/:coleccion/asistentes
 */
router.get("/:coleccion/asistentes", async (req, res) => {
  try {
    const { coleccion } = req.params;
    const tiposAsistentes = await obtenerTiposAsistentes(coleccion);
    res.json(tiposAsistentes);
  } catch (error) {
    console.error("❌ Error obteniendo tipos de asistentes:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint para exportar historial de chat
 * GET /chats/:coleccion/exportar
 */
router.get("/:coleccion/exportar", async (req, res) => {
  try {
    const { coleccion } = req.params;
    const { 
      asistente, 
      sessionId, 
      fechaInicio, 
      fechaFin, 
      busqueda 
    } = req.query;

    // Construir objeto de filtros
    const filtros = {};
    if (asistente) filtros.asistente = asistente;
    if (sessionId) filtros.sessionId = sessionId;
    if (fechaInicio) filtros.fechaInicio = fechaInicio;
    if (fechaFin) filtros.fechaFin = fechaFin;
    if (busqueda) filtros.busqueda = busqueda;

    // Obtener historial para exportar
    const historial = await exportarHistorial(coleccion, filtros);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=historial-${coleccion}-${new Date().toISOString().slice(0,10)}.json`);
    
    // Enviar datos como archivo descargable
    res.json(historial);
  } catch (error) {
    console.error("❌ Error exportando historial:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
