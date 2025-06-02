const express = require("express");
const router = express.Router();
const { 
  obtenerEstadisticasDashboard 
} = require("../services/dashboardService");

/**
 * Ruta principal del dashboard
 * GET /dashboard
 */
router.get("/", async (req, res) => {
  try {
    // Obtener todas las estadísticas para el dashboard
    const estadisticas = await obtenerEstadisticasDashboard();
    
    // Renderizar vista con datos
    res.render("dashboard", { 
      stats: estadisticas,
      error: null
    });
  } catch (error) {
    console.error("❌ Error cargando el dashboard:", error);
    res.status(500).render("dashboard", { 
      stats: null,
      error: "Error al cargar las estadísticas del dashboard: " + error.message
    });
  }
});

/**
 * Ruta para obtener estadísticas específicas (API)
 * GET /dashboard/stats/:tipo
 */
router.get("/stats/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    let datos;
    
    switch (tipo) {
      case "total-por-asistente":
        datos = await obtenerTotalPorAsistente();
        break;
      case "conversaciones-por-dia":
        datos = await obtenerConversacionesPorPeriodo("dia");
        break;
      case "conversaciones-por-semana":
        datos = await obtenerConversacionesPorPeriodo("semana");
        break;
      case "conversaciones-por-mes":
        datos = await obtenerConversacionesPorPeriodo("mes");
        break;
      case "promedio-mensajes":
        datos = await obtenerPromedioMensajes();
        break;
      case "conversaciones-recientes":
        datos = await obtenerConversacionesRecientes(5);
        break;
      default:
        return res.status(400).json({ error: "Tipo de estadística no válido" });
    }
    
    res.json(datos);
  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas (${req.params.tipo}):`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
