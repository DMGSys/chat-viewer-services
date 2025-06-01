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
    
    // Filtrar por tipo de asistente basado en la colección o contenido
    // En este caso, el tipo de asistente puede estar determinado por la colección
    if (filtros.asistente) {
      // Si se usa una colección específica para cada asistente, no necesitamos filtrar por asistente
      // Pero podemos agregar lógica específica si es necesario
      if (coleccion === "asistente_pw" && filtros.asistente !== "Pampawagen") {
        return []; // Si se busca otro asistente en la colección de Pampawagen, retornar vacío
      } else if (coleccion === "asistente_fc" && filtros.asistente !== "Fortecar") {
        return []; // Si se busca otro asistente en la colección de Fortecar, retornar vacío
      } else if (coleccion === "asistente" && filtros.asistente !== "Granville") {
        return []; // Si se busca otro asistente en la colección de Granville, retornar vacío
      }
      
      // Alternativamente, podemos buscar en el contenido de los mensajes
      // para identificar el tipo de asistente
      if (filtros.asistente === "Pampawagen") {
        query["messages.data.content"] = { $regex: "Pampawagen|Martina", $options: "i" };
      } else if (filtros.asistente === "Fortecar") {
        query["messages.data.content"] = { $regex: "Fortecar", $options: "i" };
      } else if (filtros.asistente === "Granville") {
        query["messages.data.content"] = { $regex: "Granville", $options: "i" };
      }
    }
    
    // Filtrar por sessionId (número de teléfono)
    if (filtros.sessionId) {
      query.sessionId = filtros.sessionId;
    }
    
    // Filtrar por rango de fechas en los mensajes
    if (filtros.fechaInicio || filtros.fechaFin) {
      // Buscar documentos que tengan al menos un mensaje dentro del rango de fechas
      const fechaQuery = {};
      
      if (filtros.fechaInicio) {
        fechaQuery.$gte = new Date(filtros.fechaInicio);
      }
      
      if (filtros.fechaFin) {
        fechaQuery.$lte = new Date(filtros.fechaFin);
      }
      
      // Buscar en el timestamp de los mensajes
      query["messages.timestamp"] = fechaQuery;
    }
    
    // Búsqueda por palabras clave en mensajes
    if (filtros.busqueda) {
      // Buscar en el contenido de los mensajes
      query["messages.data.content"] = { $regex: filtros.busqueda, $options: 'i' };
    }
    
    console.log("🔍 Aplicando filtros:", JSON.stringify(query));
    
    // Configurar ordenamiento
    const sort = {};
    
    // Manejar ordenamiento especial para campos anidados
    if (ordenamiento.campo === "fecha") {
      // Ordenar por la fecha del último mensaje
      sort["messages.timestamp"] = ordenamiento.direccion;
    } else {
      sort[ordenamiento.campo] = ordenamiento.direccion;
    }
    
    // Obtener los documentos
    const datos = await db.collection(coleccion)
      .find(query)
      .sort(sort)
      .limit(limite)
      .toArray();
    
    // Procesar los datos para adaptarlos al formato esperado por la vista
    return datos.map(chat => {
      // Determinar el tipo de asistente basado en la colección o el contenido
      let tipoAsistente = "Desconocido";
      if (coleccion === "asistente_pw") {
        tipoAsistente = "Pampawagen";
      } else if (coleccion === "asistente_fc") {
        tipoAsistente = "Fortecar";
      } else if (coleccion === "asistente") {
        tipoAsistente = "Granville";
      } else {
        // Intentar determinar por el contenido de los mensajes
        const mensajesAsistente = chat.messages.filter(m => m.type === "ai");
        if (mensajesAsistente.length > 0) {
          const contenido = mensajesAsistente[0].data.content;
          if (contenido.includes("Pampawagen") || contenido.includes("Martina")) {
            tipoAsistente = "Pampawagen";
          } else if (contenido.includes("Fortecar")) {
            tipoAsistente = "Fortecar";
          } else if (contenido.includes("Granville")) {
            tipoAsistente = "Granville";
          }
        }
      }
      
      // Convertir mensajes al formato esperado por la vista
      const mensajes = chat.messages.map(mensaje => {
        return {
          texto: mensaje.data.content,
          esUsuario: mensaje.type === "human",
          fecha: mensaje.timestamp
        };
      });
      
      // Crear un objeto adaptado para la vista
      return {
        _id: chat._id,
        sessionId: chat.sessionId,
        fecha: chat.messages && chat.messages.length > 0 ? chat.messages[0].timestamp : new Date(),
        mensajes: mensajes,
        // Agregar campos de asistente según el tipo
        ...(tipoAsistente === "Granville" && { asistente: "Granville" }),
        ...(tipoAsistente === "Fortecar" && { asistente_fc: "Fortecar" }),
        ...(tipoAsistente === "Pampawagen" && { asistente_pw: "Pampawagen" })
      };
    });
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
