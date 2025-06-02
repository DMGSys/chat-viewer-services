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

async function obtenerChats(coleccion) {
  try {
    const db = await connect();

    console.log("📥 Consultando colección:", coleccion); // 👈 AGREGÁ ACÁ

    const datos = await db.collection(coleccion).find({}).sort({ _id: -1 }).limit(100).toArray();
    return datos;
  } catch (error) {
    console.error("❌ Error consultando MongoDB:", error.message);
    return [];
  }
}


module.exports = { obtenerChats };
