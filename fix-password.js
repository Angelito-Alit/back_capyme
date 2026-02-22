const bcrypt = require('bcryptjs');
const { prisma } = require('./src/config/database');

async function fix() {
  const hash = await bcrypt.hash('$2a$10$X5HQZ5V9Zs3k5j7W8F9R.eO1GN6F5P5mU8H9L3D4K2W1X6Y7Z8A9B', 10);
  await prisma.usuario.update({
    where: { email: 'admin@capyme.com' },
    data: { password: hash }
  });
  console.log('Contraseña actualizada');
  await prisma.$disconnect();
}
fix();