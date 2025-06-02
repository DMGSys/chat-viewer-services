const { MongoClient } = require("mongodb");

// Usar la URI de MongoDB del archivo .env
const uri = process.env.MONGODB_URI;
const dbName = "Agendamientos"; // Nombre de la base de datos

let client;

/**
 * Conecta a la base de datos MongoDB
 * @returns {Object} - Instancia de la base de datos
 * @throws {Error} - Si no se puede conectar a la base de datos
 */
async function connect() {
  try {
    if (!uri) {
      throw new Error("La variable de entorno MONGODB_URI no está definida. Verifique su archivo .env");
    }
    
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
      console.log("✅ Conectado a MongoDB Atlas desde DashboardService");
    }
    return client.db(dbName);
  } catch (error) {
    console.error("❌ Error de conexión a MongoDB:", error.message);
    throw new Error(`No se pudo conectar a MongoDB: ${error.message}`);
  }
}

/**
 * Obtiene el total de chats por cada tipo de asistente
 * @returns {Array} - Array con totales por asistente
 */
async function obtenerTotalPorAsistente() {
  try {
    const db = await connect();
    
    // Consultar cada colección para obtener el total de documentos
    const totalGranville = await db.collection("asistente").countDocuments();
    const totalFortecar = await db.collection("asistente_fc").countDocuments();
    const totalPampawagen = await db.collection("asistente_pw").countDocuments();
    
    return [
      { nombre: "Granville", total: totalGranville, color: "#4a6fa5" },
      { nombre: "Fortecar", total: totalFortecar, color: "#28a745" },
      { nombre: "Pampawagen", total: totalPampawagen, color: "#ffc107" }
    ];
  } catch (error) {
    console.error("❌ Error obteniendo total por asistente:", error.message);
    return [];
  }
}

/**
 * Obtiene el total de conversaciones por período de tiempo
 * @param {string} periodo - Período de tiempo (dia, semana, mes)
 * @param {string} coleccion - Nombre de la colección (opcional)
 * @returns {Array} - Array con totales por período
 */
async function obtenerConversacionesPorPeriodo(periodo = "dia", coleccion = null) {
  try {
    const db = await connect();
    const fechaActual = new Date();
    const resultados = [];
    
    // Configurar período
    let unidad, formato, cantidadPeriodos;
    switch (periodo.toLowerCase()) {
      case "semana":
        unidad = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
        formato = { weekday: 'long' };
        cantidadPeriodos = 7;
        break;
      case "mes":
        unidad = 24 * 60 * 60 * 1000; // 1 día en milisegundos
        formato = { day: 'numeric', month: 'short' };
        cantidadPeriodos = 30;
        break;
      default: // día (últimas 24 horas)
        unidad = 60 * 60 * 1000; // 1 hora en milisegundos
        formato = { hour: '2-digit' };
        cantidadPeriodos = 24;
    }
    
    // Preparar colecciones a consultar
    const colecciones = coleccion ? 
      [coleccion] : 
      ["asistente", "asistente_fc", "asistente_pw"];
    
    // Para cada período, contar conversaciones en cada colección
    for (let i = 0; i < cantidadPeriodos; i++) {
      const fechaInicio = new Date(fechaActual - ((i + 1) * unidad));
      const fechaFin = new Date(fechaActual - (i * unidad));
      
      let total = 0;
      
      for (const col of colecciones) {
        // Consulta para contar documentos en el rango de fechas
        const count = await db.collection(col).countDocuments({
          "messages.timestamp": {
            $gte: fechaInicio,
            $lt: fechaFin
          }
        });
        
        total += count;
      }
      
      // Formatear etiqueta según el período
      const etiqueta = fechaInicio.toLocaleDateString('es-ES', formato);
      
      resultados.unshift({ 
        periodo: etiqueta, 
        total: total 
      });
    }
    
    return resultados;
  } catch (error) {
    console.error(`❌ Error obteniendo conversaciones por ${periodo}:`, error.message);
    return [];
  }
}

/**
 * Calcula el promedio de mensajes por conversación
 * @param {string} coleccion - Nombre de la colección (opcional)
 * @returns {Object} - Objeto con promedio general y por asistente
 */
async function obtenerPromedioMensajes(coleccion = null) {
  try {
    const db = await connect();
    const resultado = {
      promedioGeneral: 0,
      porAsistente: []
    };
    
    // Preparar colecciones a consultar
    const colecciones = coleccion ? 
      [coleccion] : 
      [
        { nombre: "asistente", label: "Granville" },
        { nombre: "asistente_fc", label: "Fortecar" },
        { nombre: "asistente_pw", label: "Pampawagen" }
      ];
    
    let totalMensajes = 0;
    let totalConversaciones = 0;
    
    // Para cada colección, calcular el promedio
    for (const col of colecciones) {
      const nombreCol = typeof col === 'string' ? col : col.nombre;
      const labelCol = typeof col === 'string' ? col : col.label;
      
      // Pipeline de agregación para contar mensajes
      const pipeline = [
        {
          $project: {
            sessionId: 1,
            cantidadMensajes: { $size: "$messages" }
          }
        },
        {
          $group: {
            _id: null,
            totalConversaciones: { $sum: 1 },
            totalMensajes: { $sum: "$cantidadMensajes" },
            promedio: { $avg: "$cantidadMensajes" }
          }
        }
      ];
      
      const resultadoAgregacion = await db.collection(nombreCol).aggregate(pipeline).toArray();
      
      if (resultadoAgregacion.length > 0) {
        const { totalConversaciones: convCol, totalMensajes: mensajesCol, promedio } = resultadoAgregacion[0];
        
        // Acumular totales para el promedio general
        totalMensajes += mensajesCol;
        totalConversaciones += convCol;
        
        // Agregar promedio por asistente
        resultado.porAsistente.push({
          asistente: labelCol,
          promedio: Math.round(promedio * 100) / 100
        });
      }
    }
    
    // Calcular promedio general
    if (totalConversaciones > 0) {
      resultado.promedioGeneral = Math.round((totalMensajes / totalConversaciones) * 100) / 100;
    }
    
    return resultado;
  } catch (error) {
    console.error("❌ Error calculando promedio de mensajes:", error.message);
    return { promedioGeneral: 0, porAsistente: [] };
  }
}

/**
 * Obtiene las conversaciones más recientes
 * @param {number} limite - Cantidad máxima de conversaciones a retornar
 * @param {string} coleccion - Nombre de la colección (opcional)
 * @returns {Array} - Array con las conversaciones más recientes
 */
async function obtenerConversacionesRecientes(limite = 5, coleccion = null) {
  try {
    const db = await connect();
    let conversaciones = [];
    
    // Preparar colecciones a consultar
    const colecciones = coleccion ? 
      [coleccion] : 
      ["asistente", "asistente_fc", "asistente_pw"];
    
    // Para cada colección, obtener las conversaciones más recientes
    for (const col of colecciones) {
      // Determinar tipo de asistente según colección
      let tipoAsistente;
      if (col === "asistente") {
        tipoAsistente = "Granville";
      } else if (col === "asistente_fc") {
        tipoAsistente = "Fortecar";
      } else if (col === "asistente_pw") {
        tipoAsistente = "Pampawagen";
      } else {
        tipoAsistente = "Desconocido";
      }
      
      // Obtener las conversaciones más recientes
      const recientes = await db.collection(col)
        .find({})
        .sort({ "messages.timestamp": -1 })
        .limit(limite)
        .project({
          _id: 1,
          sessionId: 1,
          "messages.timestamp": 1,
          "messages.type": 1,
          "messages.data.content": 1
        })
        .toArray();
      
      // Procesar cada conversación para extraer datos relevantes
      recientes.forEach(conv => {
        // Ordenar mensajes por timestamp (más reciente primero)
        const mensajes = conv.messages || [];
        mensajes.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        // Obtener el último mensaje y su timestamp
        const ultimoMensaje = mensajes.length > 0 ? mensajes[0] : null;
        const fecha = ultimoMensaje ? new Date(ultimoMensaje.timestamp) : new Date();
        
        // Agregar a la lista de conversaciones
        conversaciones.push({
          _id: conv._id,
          sessionId: conv.sessionId,
          asistente: tipoAsistente,
          fecha: fecha,
          cantidadMensajes: mensajes.length,
          ultimoMensaje: ultimoMensaje ? {
            tipo: ultimoMensaje.type,
            contenido: ultimoMensaje.data.content.substring(0, 100) + (ultimoMensaje.data.content.length > 100 ? '...' : '')
          } : null
        });
      });
    }
    
    // Ordenar todas las conversaciones por fecha (más reciente primero)
    conversaciones.sort((a, b) => b.fecha - a.fecha);
    
    // Limitar al número solicitado
    return conversaciones.slice(0, limite);
  } catch (error) {
    console.error("❌ Error obteniendo conversaciones recientes:", error.message);
    return [];
  }
}

/**
 * Obtiene todas las estadísticas para el dashboard
 * @returns {Object} - Objeto con todas las estadísticas
 */
async function obtenerEstadisticasDashboard() {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      totalPorAsistente,
      conversacionesPorDia,
      conversacionesPorSemana,
      conversacionesPorMes,
      promedioMensajes,
      conversacionesRecientes
    ] = await Promise.all([
      obtenerTotalPorAsistente(),
      obtenerConversacionesPorPeriodo("dia"),
      obtenerConversacionesPorPeriodo("semana"),
      obtenerConversacionesPorPeriodo("mes"),
      obtenerPromedioMensajes(),
      obtenerConversacionesRecientes(5)
    ]);
    
    return {
      totalPorAsistente,
      conversacionesPorPeriodo: {
        dia: conversacionesPorDia,
        semana: conversacionesPorSemana,
        mes: conversacionesPorMes
      },
      promedioMensajes,
      conversacionesRecientes
    };
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas del dashboard:", error.message);
    return {
      totalPorAsistente: [],
      conversacionesPorPeriodo: { dia: [], semana: [], mes: [] },
      promedioMensajes: { promedioGeneral: 0, porAsistente: [] },
      conversacionesRecientes: []
    };
  }
}

module.exports = {
  obtenerTotalPorAsistente,
  obtenerConversacionesPorPeriodo,
  obtenerPromedioMensajes,
  obtenerConversacionesRecientes,
  obtenerEstadisticasDashboard
};
