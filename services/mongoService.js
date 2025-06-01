const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = "Agendamientos"; // o "openapp" si cambiaste

let client;

async function connect() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Conectado a MongoDB");
  }
  return client.db(dbName);
}

/**
 * Obtiene chats con filtros, búsqueda y ordenamiento
 * @param {string} coleccion - Nombre de la colección
 * @param {Object} filtros - Objeto con filtros a aplicar
 * @param {string} filtros.asistente - Tipo de asistente (Granville, Fortecar, Pampawagen)
 * @param {string} filtros.sessionId - ID de sesión (número de teléfono)
 * @param {Date} filtros.fechaInicio - Fecha inicial para filtrar
 * @param {Date} filtros.fechaFin - Fecha final para filtrar
 * @param {string} filtros.busqueda - Texto para buscar en los mensajes
 * @param {Object} ordenamiento - Campo y dirección para ordenar
 * @param {string} ordenamiento.campo - Campo por el cual ordenar
 * @param {number} ordenamiento.direccion - Dirección (1: ascendente, -1: descendente)
 * @param {number} limite - Cantidad máxima de documentos a retornar
 * @returns {Array} - Arreglo de documentos
 */
async function obtenerChats(coleccion, filtros = {}, ordenamiento = { campo: "_id", direccion: -1 }, limite = 100) {
  try {
    const db = await connect();
    console.log("📥 Consultando colección:", coleccion);
    
    // Construir query de filtros
    const query = {};
    
    // Filtrar por tipo de asistente
    if (filtros.asistente) {
      if (filtros.asistente === "Granville") {
        query.asistente = "Granville";
      } else if (filtros.asistente === "Fortecar") {
        query.asistente_fc = "Fortecar";
      } else if (filtros.asistente === "Pampawagen") {
        query.asistente_pw = "Pampawagen";
      }
    }
    
    // Filtrar por sessionId (número de teléfono)
    if (filtros.sessionId) {
      query.sessionId = filtros.sessionId;
    }
    
    // Filtrar por rango de fechas
    if (filtros.fechaInicio || filtros.fechaFin) {
      query.fecha = {};
      if (filtros.fechaInicio) {
        query.fecha.$gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        query.fecha.$lte = new Date(filtros.fechaFin);
      }
    }
    
    // Búsqueda por palabras clave en mensajes
    if (filtros.busqueda) {
      query.$or = [
        { 'mensajes.texto': { $regex: filtros.busqueda, $options: 'i' } },
        { 'mensaje': { $regex: filtros.busqueda, $options: 'i' } }
      ];
    }
    
    console.log("🔍 Aplicando filtros:", JSON.stringify(query));
    
    // Configurar ordenamiento
    const sort = {};
    sort[ordenamiento.campo] = ordenamiento.direccion;
    
    const datos = await db.collection(coleccion)
      .find(query)
      .sort(sort)
      .limit(limite)
      .toArray();
      
    return datos;
  } catch (error) {
    console.error("❌ Error consultando MongoDB:", error.message);
    return [];
  }
}

/**
 * Obtiene lista de sessionIds únicos para mostrar en dropdown
 * @param {string} coleccion - Nombre de la colección
 * @returns {Array} - Arreglo de sessionIds únicos
 */
async function obtenerSessionIds(coleccion) {
  try {
    const db = await connect();
    const sessionIds = await db.collection(coleccion)
      .distinct("sessionId");
    return sessionIds;
  } catch (error) {
    console.error("❌ Error obteniendo sessionIds:", error.message);
    return [];
  }
}

/**
 * Exporta historial de chat según filtros
 * @param {string} coleccion - Nombre de la colección
 * @param {Object} filtros - Objeto con filtros a aplicar
 * @returns {Array} - Arreglo de documentos para exportar
 */
async function exportarHistorial(coleccion, filtros = {}) {
  try {
    // Usar la misma función de obtenerChats pero sin límite
    return await obtenerChats(coleccion, filtros, { campo: "fecha", direccion: 1 }, 1000);
  } catch (error) {
    console.error("❌ Error exportando historial:", error.message);
    return [];
  }
}

/**
 * Obtiene tipos de asistentes disponibles
 * @param {string} coleccion - Nombre de la colección
 * @returns {Array} - Arreglo con los tipos de asistentes
 */
async function obtenerTiposAsistentes(coleccion) {
  // Por ahora retornamos los tipos fijos, pero podría ser dinámico
  return ["Granville", "Fortecar", "Pampawagen"];
}

module.exports = { 
  obtenerChats, 
  obtenerSessionIds, 
  exportarHistorial,
  obtenerTiposAsistentes
};
