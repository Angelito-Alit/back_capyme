// src/config/database.js - Prisma 7
const { PrismaClient } = require('@prisma/client');

// Crear instancia de Prisma con configuración para Prisma 7
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Manejar desconexión
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Función para verificar conexión
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    return false;
  }
}

module.exports = { prisma, testConnection };