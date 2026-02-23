const bcrypt = require('bcryptjs');
const { prisma } = require('./src/config/database');

async function fix() {
  const hash = await bcrypt.hash('123456789', 10);
  await prisma.usuario.update({
    where: { email: 'admin@capyme.com' },
    data: { password: hash }
  });
  console.log('Contraseña actualizada');
  await prisma.$disconnect();
}
fix();