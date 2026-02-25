// =============================================================
// CAPYME - seed.js
// Uso: node seed.js
// Requiere: .env con DATABASE_URL configurado y Prisma Client generado
// =============================================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

// ─── Colores para consola ──────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
const ok  = (msg) => console.log(`${c.green}  ✔ ${msg}${c.reset}`);
const info = (msg) => console.log(`${c.cyan}  → ${msg}${c.reset}`);
const warn = (msg) => console.log(`${c.yellow}  ⚠ ${msg}${c.reset}`);
const err  = (msg) => console.log(`${c.red}  ✘ ${msg}${c.reset}`);
const title = (msg) => console.log(`\n${c.bold}${c.cyan}[ ${msg} ]${c.reset}`);

// ─── Helper: upsert genérico con log ──────────────────────────
async function upsertMany(label, items, fn) {
  title(label);
  let count = 0;
  for (const item of items) {
    try {
      await fn(item);
      count++;
    } catch (e) {
      warn(`Omitido (${e.code ?? e.message}): ${JSON.stringify(item).slice(0, 80)}`);
    }
  }
  ok(`${count}/${items.length} registros procesados`);
}

// =============================================================
// MAIN
// =============================================================
async function main() {
  console.log(`\n${c.bold}╔════════════════════════════════════════╗`);
  console.log(`║       CAPYME – Seed de datos           ║`);
  console.log(`╚════════════════════════════════════════╝${c.reset}`);

  // ── 1. CONTACTO CAPYME ──────────────────────────────────────
  title('Contacto CAPYME');
  try {
    const exists = await prisma.contactoCapyme.findFirst();
    if (!exists) {
      await prisma.contactoCapyme.create({
        data: {
          telefono:        '442-421-3428',
          email:           'contacto@capyme.mx',
          direccion:       'Av. Tecnológico 100, Col. Centro, Santiago de Querétaro, Qro. C.P. 76000',
          horarioAtencion: 'Lunes a Viernes 9:00 - 18:00 hrs | Sábado 9:00 - 13:00 hrs',
          whatsapp:        '4424213428',
          facebookUrl:     'https://www.facebook.com/capymemx',
          instagramUrl:    'https://www.instagram.com/capymemx',
          linkedinUrl:     'https://www.linkedin.com/company/capymemx',
          sitioWeb:        'https://www.capyme.mx',
        },
      });
      ok('Contacto creado');
    } else {
      warn('Contacto ya existe, omitido');
    }
  } catch (e) {
    err(`Error en contacto: ${e.message}`);
  }

  // ── 2. CATEGORÍAS DE NEGOCIO ────────────────────────────────
  const categorias = [
    { id: 1,  nombre: 'Comercio al por menor',    descripcion: 'Tiendas, abarrotes, ferreterías y comercios minoristas en general.' },
    { id: 2,  nombre: 'Alimentos y Bebidas',       descripcion: 'Restaurantes, fondas, cafeterías, panaderías y servicios de catering.' },
    { id: 3,  nombre: 'Manufactura y Producción',  descripcion: 'Talleres, maquiladoras, fabricantes de productos artesanales e industriales.' },
    { id: 4,  nombre: 'Servicios Profesionales',   descripcion: 'Despachos contables, jurídicos, consultorías, agencias de marketing.' },
    { id: 5,  nombre: 'Tecnología e Innovación',   descripcion: 'Desarrollo de software, comercio electrónico, startups tecnológicas.' },
    { id: 6,  nombre: 'Construcción y Vivienda',   descripcion: 'Constructoras, inmobiliarias, contratistas y materiales de construcción.' },
    { id: 7,  nombre: 'Agropecuario',              descripcion: 'Agricultura, ganadería, acuacultura y agroindustria.' },
    { id: 8,  nombre: 'Turismo y Hospitalidad',    descripcion: 'Hoteles, hostales, agencias de viaje y servicios turísticos.' },
    { id: 9,  nombre: 'Salud y Bienestar',         descripcion: 'Clínicas, consultorios, spas, gimnasios y productos de salud.' },
    { id: 10, nombre: 'Educación y Capacitación',  descripcion: 'Escuelas privadas, centros de idiomas, academias y tutorías.' },
  ];

  await upsertMany('Categorías de negocio', categorias, (cat) =>
    prisma.categoriaNegocio.upsert({
      where:  { nombre: cat.nombre },
      update: {},
      create: { nombre: cat.nombre, descripcion: cat.descripcion, activo: true },
    })
  );

  // Recuperar IDs reales (pueden diferir si ya existían)
  const catMap = {};
  const catsDB = await prisma.categoriaNegocio.findMany({ select: { id: true, nombre: true } });
  for (const c of catsDB) catMap[c.nombre] = c.id;

  // ── 3. USUARIOS ─────────────────────────────────────────────
  title('Usuarios');
  const passwordHash = await bcrypt.hash('Capyme2024!', 10);
  const passwordClienteHash = await bcrypt.hash('Cliente2024!', 10);

  const usuariosData = [
    // Admins
    { nombre: 'Mariana',   apellido: 'López Garza',        email: 'mariana.lopez@capyme.mx',       rol: 'admin',       hash: passwordHash },
    { nombre: 'Carlos',    apellido: 'Ramírez Herrera',    email: 'carlos.ramirez@capyme.mx',      rol: 'admin',       hash: passwordHash },
    // Colaboradores
    { nombre: 'Sofía',     apellido: 'Mendoza Torres',     email: 'sofia.mendoza@capyme.mx',       rol: 'colaborador', hash: passwordHash },
    { nombre: 'Diego',     apellido: 'Flores Sánchez',     email: 'diego.flores@capyme.mx',        rol: 'colaborador', hash: passwordHash },
    { nombre: 'Alejandro', apellido: 'Vega Morales',       email: 'alejandro.vega@capyme.mx',      rol: 'colaborador', hash: passwordHash },
    // Clientes
    { nombre: 'Roberto',   apellido: 'Gutiérrez Peña',     email: 'roberto.gutierrez@gmail.com',   rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Laura',     apellido: 'Castillo Ríos',      email: 'laura.castillo@hotmail.com',    rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Enrique',   apellido: 'Vargas Domínguez',   email: 'enrique.vargas@outlook.com',    rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Fernanda',  apellido: 'Ortiz Cruz',         email: 'fernanda.ortiz@gmail.com',      rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Miguel',    apellido: 'Reyes Luna',         email: 'miguel.reyes@yahoo.com',        rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Patricia',  apellido: 'Jiménez Gómez',      email: 'patricia.jimenez@gmail.com',    rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Héctor',    apellido: 'Moreno Alvarado',    email: 'hector.moreno@empresa.mx',      rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Claudia',   apellido: 'Ruiz Medina',        email: 'claudia.ruiz@gmail.com',        rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Jorge',     apellido: 'Hernández Paredes',  email: 'jorge.hernandez@hotmail.com',   rol: 'cliente',     hash: passwordClienteHash },
    { nombre: 'Valeria',   apellido: 'Aguilar Escobar',    email: 'valeria.aguilar@gmail.com',     rol: 'cliente',     hash: passwordClienteHash },
  ];

  let createdUsers = 0;
  for (const u of usuariosData) {
    try {
      await prisma.usuario.upsert({
        where:  { email: u.email },
        update: {},
        create: {
          nombre:    u.nombre,
          apellido:  u.apellido,
          email:     u.email,
          password:  u.hash,
          telefono:  null,
          rol:       u.rol,
          activo:    true,
          clabeInterbancaria: u.rol === 'admin' ? '014760025801234567' : null,
          whatsappPagos:      u.rol === 'admin' ? '4424213428' : null,
        },
      });
      createdUsers++;
    } catch (e) {
      warn(`Usuario omitido (${e.code ?? e.message}): ${u.email}`);
    }
  }
  ok(`${createdUsers}/${usuariosData.length} usuarios procesados`);
  info(`Contraseña admins/colaboradores: Capyme2024!`);
  info(`Contraseña clientes: Cliente2024!`);

  // Cargar mapa de usuarios por email
  const userMap = {};
  const usersDB = await prisma.usuario.findMany({ select: { id: true, email: true } });
  for (const u of usersDB) userMap[u.email] = u.id;

  // ── 4. NEGOCIOS ─────────────────────────────────────────────
  const negociosData = [
    {
      email_usuario: 'roberto.gutierrez@gmail.com',
      nombreNegocio: 'Abarrotes Don Roberto',
      cat: 'Comercio al por menor',
      rfc: 'GUGR8501123H4',
      giroComercial: 'Venta de abarrotes y artículos de primera necesidad',
      direccion: 'Calle Hidalgo 45, Col. Centro',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76000',
      telefonoNegocio: '4422111001', emailNegocio: 'donroberto@gmail.com',
      numeroEmpleados: 4, anioFundacion: 2010,
      descripcion: 'Tienda de abarrotes con más de 14 años en el mercado local.',
    },
    {
      email_usuario: 'laura.castillo@hotmail.com',
      nombreNegocio: 'Cafetería La Buena Mesa',
      cat: 'Alimentos y Bebidas',
      rfc: 'CARL900315MK5',
      giroComercial: 'Servicios de alimentos y bebidas',
      direccion: 'Av. Constituyentes 220, Local 3',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76010',
      telefonoNegocio: '4422111002', emailNegocio: 'labuenamesa@gmail.com',
      numeroEmpleados: 8, anioFundacion: 2018,
      descripcion: 'Cafetería con menú ejecutivo y desayunos. Clientela de oficinas cercanas.',
    },
    {
      email_usuario: 'enrique.vargas@outlook.com',
      nombreNegocio: 'Taller Metálico Vargas',
      cat: 'Manufactura y Producción',
      rfc: 'VADE780920PQ1',
      giroComercial: 'Fabricación y soldadura de estructuras metálicas',
      direccion: 'Blvd. Bernardo Quintana 540',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76030',
      telefonoNegocio: '4422111003', emailNegocio: 'tallervargas@outlook.com',
      numeroEmpleados: 12, anioFundacion: 2005,
      descripcion: 'Taller de estructuras metálicas para construcción y muebles industriales.',
    },
    {
      email_usuario: 'fernanda.ortiz@gmail.com',
      nombreNegocio: 'Fernanda Ortiz Consultoría',
      cat: 'Servicios Profesionales',
      rfc: 'OICF920410AZ3',
      giroComercial: 'Consultoría fiscal y contable para PYMES',
      direccion: 'Prol. Corregidora Norte 180 Int 5',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76000',
      telefonoNegocio: '4422111004', emailNegocio: 'fernanda.consultoria@gmail.com',
      numeroEmpleados: 3, anioFundacion: 2019,
      descripcion: 'Despacho contable especializado en régimen RESICO y personas morales.',
    },
    {
      email_usuario: 'miguel.reyes@yahoo.com',
      nombreNegocio: 'TechSol Desarrollo Web',
      cat: 'Tecnología e Innovación',
      rfc: 'RELM950630BT8',
      giroComercial: 'Desarrollo de software y soluciones digitales',
      direccion: 'Av. Epigmenio González 500 Int 12',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76140',
      telefonoNegocio: '4422111005', emailNegocio: 'techsol@yahoo.com',
      numeroEmpleados: 5, anioFundacion: 2020,
      descripcion: 'Startup de desarrollo web y aplicaciones móviles para pequeños negocios.',
    },
    {
      email_usuario: 'patricia.jimenez@gmail.com',
      nombreNegocio: 'Panadería Santa Clara',
      cat: 'Alimentos y Bebidas',
      rfc: 'JIGP810718YK2',
      giroComercial: 'Elaboración y venta de pan artesanal',
      direccion: 'Calle Allende 78, Col. Las Flores',
      ciudad: 'San Juan del Río', estado: 'Querétaro', codigoPostal: '76800',
      telefonoNegocio: '4272111001', emailNegocio: 'santaclara.pan@gmail.com',
      numeroEmpleados: 6, anioFundacion: 2012,
      descripcion: 'Panadería artesanal con recetas familiares, venta local y pedidos especiales.',
    },
    {
      email_usuario: 'hector.moreno@empresa.mx',
      nombreNegocio: 'Constructora Moreno & Asoc.',
      cat: 'Construcción y Vivienda',
      rfc: 'MOAH770305CX9',
      giroComercial: 'Construcción de vivienda residencial',
      direccion: 'Blvd. Villas del Mesón 300',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76230',
      telefonoNegocio: '4422111007', emailNegocio: 'constructora.moreno@empresa.mx',
      numeroEmpleados: 18, anioFundacion: 2008,
      descripcion: 'Constructora con proyectos habitacionales de interés social y residencial medio.',
    },
    {
      email_usuario: 'claudia.ruiz@gmail.com',
      nombreNegocio: 'Rancho Los Fresnos',
      cat: 'Agropecuario',
      rfc: 'RUMC860912DL4',
      giroComercial: 'Producción agropecuaria y horticultura',
      direccion: 'Carretera 57 Km 180',
      ciudad: 'Colón', estado: 'Querétaro', codigoPostal: '76270',
      telefonoNegocio: '4282111001', emailNegocio: 'rancholosfresnos@gmail.com',
      numeroEmpleados: 7, anioFundacion: 2015,
      descripcion: 'Unidad de producción de hortalizas y ganadería de traspatio para mercado local.',
    },
    {
      email_usuario: 'jorge.hernandez@hotmail.com',
      nombreNegocio: 'Hostal El Mirador',
      cat: 'Turismo y Hospitalidad',
      rfc: 'HEPJ880224NK7',
      giroComercial: 'Servicios de hospedaje y turismo',
      direccion: 'Calle 16 de Septiembre 33',
      ciudad: 'Bernal', estado: 'Querétaro', codigoPostal: '76590',
      telefonoNegocio: '4182111001', emailNegocio: 'hostalmirador@hotmail.com',
      numeroEmpleados: 4, anioFundacion: 2016,
      descripcion: 'Hostal boutique en Bernal, Qro., cerca de la Peña de Bernal.',
    },
    {
      email_usuario: 'valeria.aguilar@gmail.com',
      nombreNegocio: 'Centro de Idiomas Valeria',
      cat: 'Educación y Capacitación',
      rfc: 'AGEV980101SW2',
      giroComercial: 'Enseñanza de inglés y francés para adultos y niños',
      direccion: 'Av. Universidad 88, Col. Prados',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76080',
      telefonoNegocio: '4422111010', emailNegocio: 'idiomasvaleria@gmail.com',
      numeroEmpleados: 3, anioFundacion: 2021,
      descripcion: 'Academia de idiomas con metodología comunicativa. Grupos reducidos y clases en línea.',
    },
  ];

  await upsertMany('Negocios', negociosData, async (n) => {
    const userId = userMap[n.email_usuario];
    const catId  = catMap[n.cat];
    if (!userId) throw new Error(`Usuario no encontrado: ${n.email_usuario}`);
    if (!catId)  throw new Error(`Categoría no encontrada: ${n.cat}`);

    // Evitar duplicados por nombre + usuario
    const existe = await prisma.negocio.findFirst({
      where: { usuarioId: userId, nombreNegocio: n.nombreNegocio },
    });
    if (existe) throw new Error(`ya existe`);

    await prisma.negocio.create({
      data: {
        usuarioId:       userId,
        nombreNegocio:   n.nombreNegocio,
        categoriaId:     catId,
        rfc:             n.rfc,
        giroComercial:   n.giroComercial,
        direccion:       n.direccion,
        ciudad:          n.ciudad,
        estado:          n.estado,
        codigoPostal:    n.codigoPostal,
        telefonoNegocio: n.telefonoNegocio,
        emailNegocio:    n.emailNegocio,
        numeroEmpleados: n.numeroEmpleados,
        anioFundacion:   n.anioFundacion,
        descripcion:     n.descripcion,
        activo:          true,
      },
    });
  });

  // Mapa de negocios por email de usuario
  const negocioMap = {};
  const negociosDB = await prisma.negocio.findMany({
    select: { id: true, usuarioId: true, nombreNegocio: true },
  });
  for (const n of negociosDB) negocioMap[n.nombreNegocio] = n.id;

  // ── 5. PROGRAMAS ────────────────────────────────────────────
  const adminId = userMap['mariana.lopez@capyme.mx'];
  const admin2Id = userMap['carlos.ramirez@capyme.mx'];

  const programasData = [
    {
      nombre: 'Fondo PyME INADEM – Impulso Productivo 2024',
      descripcion: 'Programa federal de apoyo económico para micro y pequeñas empresas en sectores productivos prioritarios.',
      tipoPrograma: 'Financiamiento no reembolsable',
      categoriaNegocioId: null,
      requisitos: 'RFC activo, empresa con mínimo 1 año de operación, estados financieros del último ejercicio, plan de negocio.',
      beneficios: 'Hasta $150,000 MXN en capital de trabajo o activo fijo. Acompañamiento técnico.',
      fechaInicio: new Date('2024-03-01'),
      fechaCierre: new Date('2024-06-30'),
      montoApoyo: 150000,
      estado: 'Abierto',
      municipio: null,
      creadoPor: adminId,
    },
    {
      nombre: 'Jóvenes Construyendo el Futuro – Empresa Receptora',
      descripcion: 'Programa de la STPS para incorporar jóvenes de 18 a 29 años como aprendices en empresas.',
      tipoPrograma: 'Capacitación laboral',
      categoriaNegocioId: null,
      requisitos: 'Empresa constituida legalmente, IMSS al corriente, contar con tutor designado.',
      beneficios: 'Beca mensual de $6,310 pagada por el gobierno al joven. Sin costo para la empresa.',
      fechaInicio: new Date('2024-01-01'),
      fechaCierre: new Date('2024-12-31'),
      montoApoyo: 0,
      estado: 'Abierto',
      municipio: null,
      creadoPor: adminId,
    },
    {
      nombre: 'Fondo Sectorial CONAHCYT – Innovación Tecnológica',
      descripcion: 'Financiamiento para proyectos de innovación tecnológica en PyMES con base científica.',
      tipoPrograma: 'Financiamiento mixto',
      categoriaNegocioId: catMap['Tecnología e Innovación'],
      requisitos: 'Empresa de base tecnológica, convenio con institución de educación superior, plan de innovación.',
      beneficios: 'Hasta $500,000 MXN en coinversión. Acompañamiento de CONAHCYT.',
      fechaInicio: new Date('2024-04-01'),
      fechaCierre: new Date('2024-09-30'),
      montoApoyo: 500000,
      estado: 'Abierto',
      municipio: null,
      creadoPor: admin2Id,
    },
    {
      nombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024',
      descripcion: 'Apoyo estatal del SEDESU Querétaro dirigido a mujeres emprendedoras con negocios establecidos.',
      tipoPrograma: 'Subsidio estatal',
      categoriaNegocioId: null,
      requisitos: 'Titular del negocio mujer, negocio en Querétaro con mínimo 6 meses de operación, CURP y RFC.',
      beneficios: 'Hasta $30,000 MXN en equipamiento o capital de trabajo. Capacitación gratuita.',
      fechaInicio: new Date('2024-05-01'),
      fechaCierre: new Date('2024-07-31'),
      montoApoyo: 30000,
      estado: 'Abierto',
      municipio: 'Querétaro',
      creadoPor: adminId,
    },
    {
      nombre: 'PROCAMPO – Apoyo Agropecuario SADER',
      descripcion: 'Apoyo directo al campo para productores agropecuarios registrados en PROAGRO.',
      tipoPrograma: 'Apoyo directo al campo',
      categoriaNegocioId: catMap['Agropecuario'],
      requisitos: 'Superficie agrícola registrada, CURP, titular de derechos agrarios o propietario del predio.',
      beneficios: 'Pago por hectárea cultivada. Monto varía por cultivo y región.',
      fechaInicio: new Date('2024-02-01'),
      fechaCierre: new Date('2024-11-30'),
      montoApoyo: 2000,
      estado: 'Abierto',
      municipio: null,
      creadoPor: admin2Id,
    },
    {
      nombre: 'Crédito NAFIN – Cadenas Productivas',
      descripcion: 'Financiamiento preferencial de Nacional Financiera para proveedores de grandes empresas.',
      tipoPrograma: 'Crédito preferencial',
      categoriaNegocioId: null,
      requisitos: 'Ser proveedor registrado en cadena productiva NAFIN, facturas vigentes como garantía.',
      beneficios: 'Tasas desde 9% anual. Liquidez inmediata sobre cuentas por cobrar.',
      fechaInicio: new Date('2024-01-01'),
      fechaCierre: new Date('2024-12-31'),
      montoApoyo: 1000000,
      estado: 'Abierto',
      municipio: null,
      creadoPor: adminId,
    },
  ];

  await upsertMany('Programas', programasData, async (p) => {
    const existe = await prisma.programa.findFirst({ where: { nombre: p.nombre } });
    if (existe) throw new Error('ya existe');
    await prisma.programa.create({ data: p });
  });

  const progMap = {};
  const progsDB = await prisma.programa.findMany({ select: { id: true, nombre: true } });
  for (const p of progsDB) progMap[p.nombre] = p.id;

  // ── 6. PREGUNTAS DE FORMULARIO ──────────────────────────────
  const preguntasData = [
    { pregunta: '¿Cuántos años lleva operando su negocio?',               tipoRespuesta: 'numero',            obligatoria: true,  orden: 1,  categoria: 'datos_negocio',   placeholder: 'Ej. 3',  creadoPor: adminId },
    { pregunta: '¿Cuántos empleados tiene actualmente?',                   tipoRespuesta: 'numero',            obligatoria: true,  orden: 2,  categoria: 'datos_negocio',   placeholder: 'Ej. 8',  creadoPor: adminId },
    { pregunta: '¿El negocio está constituido legalmente (RFC activo)?',   tipoRespuesta: 'si_no',             obligatoria: true,  orden: 3,  categoria: 'datos_negocio',   placeholder: null,     creadoPor: adminId },
    { pregunta: '¿Cuenta con estados financieros del último ejercicio?',   tipoRespuesta: 'si_no',             obligatoria: true,  orden: 4,  categoria: 'financiero',      placeholder: null,     creadoPor: adminId },
    { pregunta: '¿Cuál es el ingreso mensual promedio de su negocio?',     tipoRespuesta: 'numero',            obligatoria: true,  orden: 5,  categoria: 'financiero',      placeholder: 'Ej. 45000', creadoPor: adminId },
    { pregunta: '¿Tiene créditos activos con instituciones bancarias?',    tipoRespuesta: 'si_no',             obligatoria: false, orden: 6,  categoria: 'financiero',      placeholder: null,     creadoPor: adminId },
    { pregunta: '¿Para qué destinará el apoyo solicitado?',                tipoRespuesta: 'seleccion_unica',   obligatoria: true,  orden: 7,  categoria: 'destino_apoyo',   placeholder: null,     creadoPor: adminId, opcionesRespuesta: ['Capital de trabajo','Compra de equipo','Remodelación','Capacitación','Otro'] },
    { pregunta: '¿El titular del negocio es mujer?',                       tipoRespuesta: 'si_no',             obligatoria: false, orden: 8,  categoria: 'perfil_titular',  placeholder: null,     creadoPor: admin2Id },
    { pregunta: '¿Tiene acceso a internet en su negocio?',                 tipoRespuesta: 'si_no',             obligatoria: false, orden: 9,  categoria: 'infraestructura', placeholder: null,     creadoPor: admin2Id },
    { pregunta: '¿Ha recibido algún apoyo gubernamental anteriormente?',   tipoRespuesta: 'si_no',             obligatoria: true,  orden: 10, categoria: 'historial',       placeholder: null,     creadoPor: adminId },
    { pregunta: '¿Cuál es el principal reto que enfrenta su negocio?',     tipoRespuesta: 'seleccion_multiple',obligatoria: false, orden: 11, categoria: 'diagnostico',     placeholder: null,     creadoPor: adminId, opcionesRespuesta: ['Falta de capital','Clientes insuficientes','Competencia','Costos elevados','Otro'] },
    { pregunta: 'Describa brevemente su proyecto o plan de uso del apoyo.',tipoRespuesta: 'texto_largo',       obligatoria: true,  orden: 12, categoria: 'destino_apoyo',   placeholder: 'Máx. 500 palabras', creadoPor: adminId },
    { pregunta: '¿El predio o local donde opera es propio o rentado?',     tipoRespuesta: 'seleccion_unica',   obligatoria: false, orden: 13, categoria: 'infraestructura', placeholder: null,     creadoPor: admin2Id, opcionesRespuesta: ['Propio','Rentado','Prestado'] },
    { pregunta: '¿Cuántos jóvenes de 18–29 años desea incorporar como aprendices JCF?', tipoRespuesta: 'numero', obligatoria: true, orden: 1, categoria: 'jcf', placeholder: 'Ej. 2', creadoPor: adminId },
    { pregunta: '¿Tiene designado un tutor interno para los jóvenes aprendices?',        tipoRespuesta: 'si_no',  obligatoria: true, orden: 2, categoria: 'jcf', placeholder: null, creadoPor: adminId },
  ];

  await upsertMany('Preguntas de formulario', preguntasData, async (p) => {
    const { opcionesRespuesta, ...rest } = p;
    const existe = await prisma.preguntaFormulario.findFirst({ where: { pregunta: p.pregunta } });
    if (existe) throw new Error('ya existe');
    await prisma.preguntaFormulario.create({
      data: { ...rest, opcionesRespuesta: opcionesRespuesta ?? null },
    });
  });

  const pregMap = {};
  const pregsDB = await prisma.preguntaFormulario.findMany({ select: { id: true, pregunta: true } });
  for (const p of pregsDB) pregMap[p.pregunta.slice(0, 50)] = p.id;

  // Helper para buscar ID de pregunta por fragmento
  const pid = (fragment) => {
    const key = Object.keys(pregMap).find((k) => k.includes(fragment));
    return key ? pregMap[key] : null;
  };

  // ── 7. PROGRAMAS ↔ PREGUNTAS ────────────────────────────────
  title('Asignación preguntas → programas');
  const progPregAsignaciones = [
    // Fondo PyME
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: '¿Cuántos años', orden: 1 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: '¿Cuántos empleados', orden: 2 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'constituido legalmente', orden: 3 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'estados financieros', orden: 4 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'ingreso mensual', orden: 5 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'créditos activos', orden: 6 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'destinará el apoyo', orden: 7 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'apoyo gubernamental', orden: 8 },
    { progNombre: 'Fondo PyME INADEM – Impulso Productivo 2024', fragPregunta: 'plan de uso', orden: 9 },
    // JCF
    { progNombre: 'Jóvenes Construyendo el Futuro – Empresa Receptora', fragPregunta: 'constituido legalmente', orden: 1 },
    { progNombre: 'Jóvenes Construyendo el Futuro – Empresa Receptora', fragPregunta: '¿Cuántos empleados', orden: 2 },
    { progNombre: 'Jóvenes Construyendo el Futuro – Empresa Receptora', fragPregunta: 'jóvenes de 18', orden: 3 },
    { progNombre: 'Jóvenes Construyendo el Futuro – Empresa Receptora', fragPregunta: 'tutor interno', orden: 4 },
    // CONAHCYT
    { progNombre: 'Fondo Sectorial CONAHCYT – Innovación Tecnológica', fragPregunta: '¿Cuántos años', orden: 1 },
    { progNombre: 'Fondo Sectorial CONAHCYT – Innovación Tecnológica', fragPregunta: 'constituido legalmente', orden: 2 },
    { progNombre: 'Fondo Sectorial CONAHCYT – Innovación Tecnológica', fragPregunta: 'plan de uso', orden: 3 },
    // Mujer Empresaria
    { progNombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', fragPregunta: 'titular del negocio es mujer', orden: 1 },
    { progNombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', fragPregunta: '¿Cuántos años', orden: 2 },
    { progNombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', fragPregunta: 'ingreso mensual', orden: 3 },
    { progNombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', fragPregunta: 'destinará el apoyo', orden: 4 },
    { progNombre: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', fragPregunta: 'plan de uso', orden: 5 },
    // PROCAMPO
    { progNombre: 'PROCAMPO – Apoyo Agropecuario SADER', fragPregunta: '¿Cuántos años', orden: 1 },
    { progNombre: 'PROCAMPO – Apoyo Agropecuario SADER', fragPregunta: 'constituido legalmente', orden: 2 },
    { progNombre: 'PROCAMPO – Apoyo Agropecuario SADER', fragPregunta: 'ingreso mensual', orden: 3 },
    // NAFIN
    { progNombre: 'Crédito NAFIN – Cadenas Productivas', fragPregunta: 'constituido legalmente', orden: 1 },
    { progNombre: 'Crédito NAFIN – Cadenas Productivas', fragPregunta: 'estados financieros', orden: 2 },
    { progNombre: 'Crédito NAFIN – Cadenas Productivas', fragPregunta: 'ingreso mensual', orden: 3 },
    { progNombre: 'Crédito NAFIN – Cadenas Productivas', fragPregunta: 'plan de uso', orden: 4 },
  ];

  let asignCount = 0;
  for (const a of progPregAsignaciones) {
    const programaId = progMap[a.progNombre];
    const preguntaId = (() => {
      for (const [k, v] of Object.entries(pregMap)) {
        if (k.toLowerCase().includes(a.fragPregunta.toLowerCase())) return v;
      }
      return null;
    })();

    if (!programaId || !preguntaId) {
      warn(`Asignación omitida: prog="${a.progNombre.slice(0,30)}" | preg="${a.fragPregunta}"`);
      continue;
    }
    try {
      await prisma.programaPregunta.upsert({
        where: { unique_programa_pregunta: { programaId, preguntaId } },
        update: {},
        create: { programaId, preguntaId, orden: a.orden, activa: true },
      });
      asignCount++;
    } catch (e) {
      warn(`Asignación omitida (${e.code})`);
    }
  }
  ok(`${asignCount}/${progPregAsignaciones.length} asignaciones procesadas`);

  // ── 8. POSTULACIONES ────────────────────────────────────────
  const postulacionesData = [
    { negocio: 'Abarrotes Don Roberto',      prog: 'Fondo PyME INADEM – Impulso Productivo 2024',              uEmail: 'roberto.gutierrez@gmail.com', estado: 'aprobada',    notas: 'Expediente completo. Aprobado en primera revisión.',         estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'Cafetería La Buena Mesa',    prog: 'Fondo PyME INADEM – Impulso Productivo 2024',              uEmail: 'laura.castillo@hotmail.com',  estado: 'en_revision', notas: 'Pendiente estados financieros actualizados.',                estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'Taller Metálico Vargas',     prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora',       uEmail: 'enrique.vargas@outlook.com',  estado: 'aprobada',    notas: 'Empresa validada en IMSS. Listo para recibir aprendices.',   estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'Fernanda Ortiz Consultoría', prog: 'Fondo PyME INADEM – Impulso Productivo 2024',              uEmail: 'fernanda.ortiz@gmail.com',    estado: 'pendiente',   notas: null,                                                         estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'TechSol Desarrollo Web',     prog: 'Fondo Sectorial CONAHCYT – Innovación Tecnológica',        uEmail: 'miguel.reyes@yahoo.com',      estado: 'en_revision', notas: 'Revisión técnica en curso con CONAHCYT.',                    estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'Panadería Santa Clara',      prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', uEmail: 'patricia.jimenez@gmail.com',  estado: 'aprobada',    notas: 'Apoyo aprobado por $28,000 MXN.',                            estadoGeo: 'Querétaro', municipio: 'San Juan del Río' },
    { negocio: 'Constructora Moreno & Asoc.',prog: 'Crédito NAFIN – Cadenas Productivas',                       uEmail: 'hector.moreno@empresa.mx',    estado: 'completada',  notas: 'Crédito ejercido por $350,000 MXN. Caso cerrado.',           estadoGeo: 'Querétaro', municipio: 'Querétaro' },
    { negocio: 'Rancho Los Fresnos',         prog: 'PROCAMPO – Apoyo Agropecuario SADER',                       uEmail: 'claudia.ruiz@gmail.com',      estado: 'aprobada',    notas: 'Superficie registrada: 4.5 ha. Apoyo: $9,000 MXN.',         estadoGeo: 'Querétaro', municipio: 'Colón' },
    { negocio: 'Hostal El Mirador',          prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', uEmail: 'jorge.hernandez@hotmail.com', estado: 'rechazada',   notas: 'No cumple requisito: titular hombre.',                       estadoGeo: 'Querétaro', municipio: 'Ezequiel Montes' },
    { negocio: 'Cafetería La Buena Mesa',    prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora',       uEmail: 'laura.castillo@hotmail.com',  estado: 'aprobada',    notas: 'Cafetería incorpora 2 aprendices JCF. Tutor: Laura Castillo.',estadoGeo: 'Querétaro', municipio: 'Querétaro' },
  ];

  await upsertMany('Postulaciones', postulacionesData, async (p) => {
    const negocioId  = negocioMap[p.negocio];
    const programaId = progMap[p.prog];
    const usuarioId  = userMap[p.uEmail];
    if (!negocioId || !programaId || !usuarioId)
      throw new Error(`FK faltante: negocio="${p.negocio}" prog="${p.prog.slice(0,30)}"`);
    const existe = await prisma.postulacion.findFirst({ where: { negocioId, programaId } });
    if (existe) throw new Error('ya existe');
    await prisma.postulacion.create({
      data: { negocioId, programaId, usuarioId, estado: p.estado, notasAdmin: p.notas, estadoGeo: p.estadoGeo, municipio: p.municipio },
    });
  });

  const postMap = {};
  const postsDB = await prisma.postulacion.findMany({ select: { id: true, negocioId: true, programaId: true } });
  for (const p of postsDB) postMap[`${p.negocioId}_${p.programaId}`] = p.id;

  const getPostId = (negocio, prog) => {
    const nId = negocioMap[negocio];
    const pId = progMap[prog];
    return postMap[`${nId}_${pId}`];
  };

  // ── 9. RESPUESTAS DE POSTULACIÓN ─────────────────────────────
  title('Respuestas de postulación');
  const respuestasSeed = [
    // Abarrotes Don Roberto → Fondo PyME
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: '¿Cuántos años', respuesta: '14' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: '¿Cuántos empleados', respuesta: '4' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'constituido legalmente', respuesta: 'Sí' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'estados financieros', respuesta: 'Sí' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'ingreso mensual', respuesta: '85000' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'créditos activos', respuesta: 'No' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'destinará el apoyo', respuesta: 'Capital de trabajo' },
    { negocio: 'Abarrotes Don Roberto', prog: 'Fondo PyME INADEM – Impulso Productivo 2024', pregFrag: 'plan de uso', respuesta: 'Adquisición de inventario para temporada alta y refrigerador industrial para ampliar línea de lácteos.' },
    // Taller Vargas → JCF
    { negocio: 'Taller Metálico Vargas', prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora', pregFrag: 'constituido legalmente', respuesta: 'Sí' },
    { negocio: 'Taller Metálico Vargas', prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora', pregFrag: '¿Cuántos empleados', respuesta: '12' },
    { negocio: 'Taller Metálico Vargas', prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora', pregFrag: 'jóvenes de 18', respuesta: '2' },
    { negocio: 'Taller Metálico Vargas', prog: 'Jóvenes Construyendo el Futuro – Empresa Receptora', pregFrag: 'tutor interno', respuesta: 'Sí' },
    // Panadería → Mujer Empresaria
    { negocio: 'Panadería Santa Clara', prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', pregFrag: 'titular del negocio es mujer', respuesta: 'Sí' },
    { negocio: 'Panadería Santa Clara', prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', pregFrag: '¿Cuántos años', respuesta: '12' },
    { negocio: 'Panadería Santa Clara', prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', pregFrag: 'ingreso mensual', respuesta: '42000' },
    { negocio: 'Panadería Santa Clara', prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', pregFrag: 'destinará el apoyo', respuesta: 'Compra de equipo' },
    { negocio: 'Panadería Santa Clara', prog: 'Programa de Apoyo a la Mujer Empresaria – Querétaro 2024', pregFrag: 'plan de uso', respuesta: 'Adquisición de horno de convección industrial para aumentar producción diaria y cumplir pedidos mayoristas.' },
  ];

  let respCount = 0;
  for (const r of respuestasSeed) {
    const postulacionId = getPostId(r.negocio, r.prog);
    const preguntaId = (() => {
      for (const [k, v] of Object.entries(pregMap)) {
        if (k.toLowerCase().includes(r.pregFrag.toLowerCase())) return v;
      }
      return null;
    })();
    if (!postulacionId || !preguntaId) {
      warn(`Respuesta omitida: negocio="${r.negocio}" | frag="${r.pregFrag}"`);
      continue;
    }
    try {
      const existe = await prisma.respuestaPostulacion.findFirst({ where: { postulacionId, preguntaId } });
      if (!existe) {
        await prisma.respuestaPostulacion.create({ data: { postulacionId, preguntaId, respuesta: r.respuesta } });
      }
      respCount++;
    } catch (e) {
      warn(`Respuesta omitida (${e.code})`);
    }
  }
  ok(`${respCount}/${respuestasSeed.length} respuestas procesadas`);

  // ── 10. TRABAJADORES JCF ─────────────────────────────────────
  const trabajadoresData = [
    {
      postKey: ['Taller Metálico Vargas', 'Jóvenes Construyendo el Futuro – Empresa Receptora'],
      nombre: 'Andrés', apellido: 'Soto Ramírez', curp: 'SORA040315HQTRMN05',
      edad: 20, sexo: 'masculino', telefono: '4421900001', email: 'andres.soto@gmail.com',
      nivelEstudios: 'Bachillerato', areaFormacion: 'Metalmecánica',
      fechaInicio: new Date('2024-02-15'), fechaFin: new Date('2025-02-14'),
      horasSemanales: 30, tutorAsignado: 'Enrique Vargas Domínguez',
    },
    {
      postKey: ['Taller Metálico Vargas', 'Jóvenes Construyendo el Futuro – Empresa Receptora'],
      nombre: 'Yesenia', apellido: 'Morales Pérez', curp: 'MOPY050820MQTRLZ07',
      edad: 18, sexo: 'femenino', telefono: '4421900002', email: 'yesenia.morales@gmail.com',
      nivelEstudios: 'Bachillerato', areaFormacion: 'Manufactura',
      fechaInicio: new Date('2024-02-15'), fechaFin: new Date('2025-02-14'),
      horasSemanales: 30, tutorAsignado: 'Enrique Vargas Domínguez',
    },
    {
      postKey: ['Cafetería La Buena Mesa', 'Jóvenes Construyendo el Futuro – Empresa Receptora'],
      nombre: 'Kevin', apellido: 'Hernández Cruz', curp: 'HECK010610HQTRRS02',
      edad: 23, sexo: 'masculino', telefono: '4421900003', email: 'kevin.hdz@gmail.com',
      nivelEstudios: 'Técnico', areaFormacion: 'Gastronomía',
      fechaInicio: new Date('2024-03-10'), fechaFin: new Date('2025-03-09'),
      horasSemanales: 30, tutorAsignado: 'Laura Castillo Ríos',
    },
    {
      postKey: ['Cafetería La Buena Mesa', 'Jóvenes Construyendo el Futuro – Empresa Receptora'],
      nombre: 'Daniela', apellido: 'Fuentes Torres', curp: 'FUTD030225MQTRRN08',
      edad: 21, sexo: 'femenino', telefono: '4421900004', email: 'daniela.fuentes@gmail.com',
      nivelEstudios: 'Técnico', areaFormacion: 'Administración',
      fechaInicio: new Date('2024-03-10'), fechaFin: new Date('2025-03-09'),
      horasSemanales: 30, tutorAsignado: 'Laura Castillo Ríos',
    },
  ];

  await upsertMany('Trabajadores JCF', trabajadoresData, async (t) => {
    const postulacionId = getPostId(t.postKey[0], t.postKey[1]);
    if (!postulacionId) throw new Error(`Postulación no encontrada: ${t.postKey[0]}`);
    const { postKey, ...data } = t;
    await prisma.trabajadorJCF.upsert({
      where:  { curp: data.curp },
      update: {},
      create: { ...data, postulacionId, activo: true },
    });
  });

  // ── 11. FORMULARIOS DE FINANCIAMIENTO ────────────────────────
  const finDataSeed = [
    { negocio: 'Abarrotes Don Roberto',      uEmail: 'roberto.gutierrez@gmail.com', monto: 120000, plazo: 24, destino: 'Capital de trabajo e inventario para temporada navideña.',           ingresos: 85000, egresos: 60000, credActivos: false, detalle: null,                                           estado: 'aprobado' },
    { negocio: 'Cafetería La Buena Mesa',    uEmail: 'laura.castillo@hotmail.com',  monto: 80000,  plazo: 18, destino: 'Adquisición de equipo de cocina industrial.',                        ingresos: 95000, egresos: 70000, credActivos: false, detalle: null,                                           estado: 'en_revision' },
    { negocio: 'Taller Metálico Vargas',     uEmail: 'enrique.vargas@outlook.com',  monto: 250000, plazo: 36, destino: 'Compra de torno CNC y sistema de soldadura automatizada.',            ingresos:180000, egresos:130000, credActivos: true,  detalle: 'Crédito automotriz BBVA $15,000/mes, 8 meses restantes.', estado: 'aprobado' },
    { negocio: 'Constructora Moreno & Asoc.',uEmail: 'hector.moreno@empresa.mx',    monto: 500000, plazo: 48, destino: 'Compra de maquinaria de construcción.',                                ingresos:320000, egresos:240000, credActivos: true,  detalle: 'Hipoteca INFONAVIT en curso.',                 estado: 'aprobado' },
    { negocio: 'Centro de Idiomas Valeria',  uEmail: 'valeria.aguilar@gmail.com',   monto: 60000,  plazo: 12, destino: 'Equipamiento de aula: laptops y proyector interactivo.',              ingresos: 40000, egresos: 25000, credActivos: false, detalle: null,                                           estado: 'enviado' },
  ];

  await upsertMany('Formularios de financiamiento', finDataSeed, async (f) => {
    const negocioId = negocioMap[f.negocio];
    const usuarioId = userMap[f.uEmail];
    if (!negocioId || !usuarioId) throw new Error(`FK faltante: ${f.negocio}`);
    const existe = await prisma.formularioFinanciamiento.findFirst({ where: { negocioId, usuarioId } });
    if (existe) throw new Error('ya existe');
    await prisma.formularioFinanciamiento.create({
      data: {
        negocioId, usuarioId,
        montoSolicitado:     f.monto,
        plazoMeses:          f.plazo,
        destinoCredito:      f.destino,
        ingresosMensuales:   f.ingresos,
        egresosMensuales:    f.egresos,
        tieneCreditosActivos:f.credActivos,
        detallesCreditos:    f.detalle,
        estado:              f.estado,
      },
    });
  });

  // ── 12. CURSOS ───────────────────────────────────────────────
  const colabSofia = userMap['sofia.mendoza@capyme.mx'];
  const colabDiego = userMap['diego.flores@capyme.mx'];
  const colabAle   = userMap['alejandro.vega@capyme.mx'];

  const cursosData = [
    { titulo: 'Taller de Formalización Empresarial',       descripcion: 'Cómo formalizar tu negocio: RFC, alta IMSS, cuenta empresarial y obligaciones fiscales básicas.', instructor: 'Sofía Mendoza Torres', duracionHoras: 8,  modalidad: 'presencial', fechaInicio: '2024-04-05', fechaFin: '2024-04-05', cupoMaximo: 25, costo: 0,   creadoPor: colabSofia },
    { titulo: 'Finanzas para PYMES: Controla tu Negocio',  descripcion: 'Flujo de caja, estados financieros básicos, punto de equilibrio y estrategias de ahorro.', instructor: 'Carlos Ramírez Herrera', duracionHoras: 12, modalidad: 'online',     fechaInicio: '2024-05-06', fechaFin: '2024-05-08', cupoMaximo: 50, costo: 350, creadoPor: admin2Id },
    { titulo: 'Marketing Digital para Emprendedores',      descripcion: 'Redes sociales, publicidad en Meta y Google Ads, contenido y SEO básico.', instructor: 'Diego Flores Sánchez',  duracionHoras: 16, modalidad: 'hibrido',    fechaInicio: '2024-06-10', fechaFin: '2024-06-12', cupoMaximo: 30, costo: 500, creadoPor: colabDiego },
    { titulo: 'Cómo Acceder a Apoyos Gubernamentales',     descripcion: 'Principales apoyos para PYMES a nivel federal, estatal y municipal. Requisitos y tips para postular.', instructor: 'Mariana López Garza', duracionHoras: 6,  modalidad: 'online',     fechaInicio: '2024-05-20', fechaFin: '2024-05-20', cupoMaximo: 100,costo: 0,   creadoPor: adminId },
    { titulo: 'Ventas y Atención al Cliente para PYMES',   descripcion: 'Técnicas de venta efectiva, manejo de objeciones, fidelización y métricas clave.', instructor: 'Alejandro Vega Morales', duracionHoras: 10, modalidad: 'presencial', fechaInicio: '2024-07-08', fechaFin: '2024-07-09', cupoMaximo: 20, costo: 400, creadoPor: colabAle },
  ];

  await upsertMany('Cursos', cursosData, async (c) => {
    const existe = await prisma.curso.findFirst({ where: { titulo: c.titulo } });
    if (existe) throw new Error('ya existe');
    await prisma.curso.create({
      data: {
        titulo:        c.titulo,
        descripcion:   c.descripcion,
        instructor:    c.instructor,
        duracionHoras: c.duracionHoras,
        modalidad:     c.modalidad,
        fechaInicio:   new Date(`${c.fechaInicio}T12:00:00Z`),
        fechaFin:      new Date(`${c.fechaFin}T12:00:00Z`),
        cupoMaximo:    c.cupoMaximo,
        costo:         c.costo,
        creadoPor:     c.creadoPor,
        activo:        true,
      },
    });
  });

  const cursoMap = {};
  const cursosDB = await prisma.curso.findMany({ select: { id: true, titulo: true } });
  for (const c of cursosDB) cursoMap[c.titulo] = c.id;

  // ── 13. INSCRIPCIONES A CURSOS ──────────────────────────────
  const inscripcionesData = [
    { curso: 'Taller de Formalización Empresarial',   uEmail: 'roberto.gutierrez@gmail.com', negocio: 'Abarrotes Don Roberto',      estado: 'completado', calificacion: 90, comentarios: 'Excelente taller, muy práctico.' },
    { curso: 'Taller de Formalización Empresarial',   uEmail: 'laura.castillo@hotmail.com',  negocio: 'Cafetería La Buena Mesa',    estado: 'completado', calificacion: 85, comentarios: 'Buena información, el instructor muy claro.' },
    { curso: 'Taller de Formalización Empresarial',   uEmail: 'fernanda.ortiz@gmail.com',    negocio: 'Fernanda Ortiz Consultoría', estado: 'completado', calificacion: 95, comentarios: 'Me ayudó a entender mis obligaciones fiscales.' },
    { curso: 'Finanzas para PYMES: Controla tu Negocio', uEmail: 'enrique.vargas@outlook.com',  negocio: 'Taller Metálico Vargas',  estado: 'en_curso',   calificacion: null, comentarios: null },
    { curso: 'Finanzas para PYMES: Controla tu Negocio', uEmail: 'miguel.reyes@yahoo.com',      negocio: 'TechSol Desarrollo Web',  estado: 'en_curso',   calificacion: null, comentarios: null },
    { curso: 'Finanzas para PYMES: Controla tu Negocio', uEmail: 'patricia.jimenez@gmail.com',  negocio: 'Panadería Santa Clara',   estado: 'inscrito',   calificacion: null, comentarios: null },
    { curso: 'Cómo Acceder a Apoyos Gubernamentales',    uEmail: 'roberto.gutierrez@gmail.com', negocio: 'Abarrotes Don Roberto',   estado: 'completado', calificacion: 88, comentarios: 'Muy útil. Ya postulé a Fondo PyME gracias a esto.' },
    { curso: 'Cómo Acceder a Apoyos Gubernamentales',    uEmail: 'laura.castillo@hotmail.com',  negocio: 'Cafetería La Buena Mesa', estado: 'completado', calificacion: 82, comentarios: null },
    { curso: 'Cómo Acceder a Apoyos Gubernamentales',    uEmail: 'claudia.ruiz@gmail.com',      negocio: 'Rancho Los Fresnos',      estado: 'completado', calificacion: 91, comentarios: 'Ahora sé cómo postular a PROCAMPO.' },
    { curso: 'Marketing Digital para Emprendedores',     uEmail: 'miguel.reyes@yahoo.com',      negocio: 'TechSol Desarrollo Web',  estado: 'inscrito',   calificacion: null, comentarios: null },
    { curso: 'Marketing Digital para Emprendedores',     uEmail: 'valeria.aguilar@gmail.com',   negocio: 'Centro de Idiomas Valeria',estado: 'inscrito',  calificacion: null, comentarios: null },
    { curso: 'Ventas y Atención al Cliente para PYMES',  uEmail: 'jorge.hernandez@hotmail.com', negocio: 'Hostal El Mirador',        estado: 'inscrito',  calificacion: null, comentarios: null },
  ];

  await upsertMany('Inscripciones a cursos', inscripcionesData, async (i) => {
    const cursoId   = cursoMap[i.curso];
    const usuarioId = userMap[i.uEmail];
    const negocioId = negocioMap[i.negocio];
    if (!cursoId || !usuarioId) throw new Error(`FK faltante: ${i.curso} / ${i.uEmail}`);
    await prisma.inscripcionCurso.upsert({
      where: { unique_usuario_curso: { usuarioId, cursoId } },
      update: {},
      create: { cursoId, usuarioId, negocioId: negocioId ?? null, estado: i.estado, calificacion: i.calificacion, comentarios: i.comentarios },
    });
  });

  // ── 14. ENLACES / RECURSOS ──────────────────────────────────
  const enlacesData = [
    { titulo: 'Compendio de Apoyos y Programas en México 2024',           descripcion: 'Catálogo con los principales programas y beneficios a nivel federal, estatal y privado.', url: 'https://www.capyme.mx/catalogo/apoyos-programas-mexico-2024', tipo: 'documento', categoria: 'Catálogos CAPYME', visiblePara: 'todos',          costo: 199, creadoPor: adminId },
    { titulo: 'Compendio de Fondos para Organizaciones Sin Fines de Lucro',descripcion: 'Programas de apoyo internacionales y nacionales para OSC en salud, medio ambiente y educación.', url: 'https://www.capyme.mx/catalogo/fondos-osc-2024', tipo: 'documento', categoria: 'Catálogos CAPYME', visiblePara: 'todos',          costo: 199, creadoPor: adminId },
    { titulo: 'Compendio de Apoyos de Vivienda en México 2024',            descripcion: 'Programas de apoyo habitacional en los 32 estados: nombre, beneficiarios, requisitos y montos.', url: 'https://www.capyme.mx/catalogo/apoyos-vivienda-2024', tipo: 'documento', categoria: 'Catálogos CAPYME', visiblePara: 'todos',          costo: 199, creadoPor: adminId },
    { titulo: 'Guía Rápida: Cómo Acceder al Programa JCF como Empresa',   descripcion: 'Pasos para registrar tu empresa en Jóvenes Construyendo el Futuro.', url: 'https://www.capyme.mx/recursos/guia-jcf-empresas', tipo: 'documento', categoria: 'Guías Gratuitas',  visiblePara: 'clientes',       costo: 0,   creadoPor: colabSofia },
    { titulo: 'Video: ¿Qué es el Fondo PyME y cómo postular?',            descripcion: 'Explicación en video de los requisitos y proceso de postulación al Fondo PyME.', url: 'https://www.youtube.com/watch?v=capyme_fondopyme', tipo: 'video',     categoria: 'Tutoriales',       visiblePara: 'todos',          costo: 0,   creadoPor: colabSofia },
    { titulo: 'Directorio de Instituciones de Financiamiento para PYMES', descripcion: 'Listado de bancos, fondos y entidades con créditos preferenciales para pequeñas empresas.', url: 'https://www.capyme.mx/recursos/directorio-financiamiento', tipo: 'financiamiento', categoria: 'Financiamiento', visiblePara: 'clientes',     costo: 0,   creadoPor: admin2Id },
    { titulo: 'Plantilla: Plan de Negocios para PYMES',                    descripcion: 'Formato descargable en Word para elaborar un plan de negocios básico.', url: 'https://www.capyme.mx/recursos/plantilla-plan-negocios', tipo: 'documento', categoria: 'Herramientas',     visiblePara: 'clientes',       costo: 0,   creadoPor: admin2Id },
    { titulo: 'Video: Compendio de Vivienda 2025 | CAPYME',                descripcion: 'Presentación en YouTube del Catálogo de Apoyos de Vivienda 2025.', url: 'https://www.youtube.com/watch?v=capyme_vivienda2025', tipo: 'video',     categoria: 'Catálogos CAPYME', visiblePara: 'todos',          costo: 0,   creadoPor: adminId },
  ];

  await upsertMany('Recursos / Catálogos', enlacesData, async (e) => {
    const existe = await prisma.enlaceRecurso.findFirst({ where: { titulo: e.titulo } });
    if (existe) throw new Error('ya existe');
    await prisma.enlaceRecurso.create({ data: e });
  });

  const enlaceMap = {};
  const enlacesDB = await prisma.enlaceRecurso.findMany({ select: { id: true, titulo: true } });
  for (const e of enlacesDB) enlaceMap[e.titulo] = e.id;

  // ── 15. ACCESOS A RECURSOS ──────────────────────────────────
  const accesosData = [
    { enlace: 'Compendio de Apoyos y Programas en México 2024',            uEmail: 'roberto.gutierrez@gmail.com', estado: 'activo' },
    { enlace: 'Compendio de Apoyos y Programas en México 2024',            uEmail: 'laura.castillo@hotmail.com',  estado: 'activo' },
    { enlace: 'Compendio de Apoyos y Programas en México 2024',            uEmail: 'fernanda.ortiz@gmail.com',    estado: 'activo' },
    { enlace: 'Compendio de Fondos para Organizaciones Sin Fines de Lucro',uEmail: 'roberto.gutierrez@gmail.com', estado: 'activo' },
    { enlace: 'Compendio de Apoyos de Vivienda en México 2024',            uEmail: 'hector.moreno@empresa.mx',    estado: 'activo' },
    { enlace: 'Compendio de Apoyos de Vivienda en México 2024',            uEmail: 'jorge.hernandez@hotmail.com', estado: 'activo' },
    { enlace: 'Compendio de Fondos para Organizaciones Sin Fines de Lucro',uEmail: 'claudia.ruiz@gmail.com',      estado: 'pendiente' },
    { enlace: 'Compendio de Apoyos y Programas en México 2024',            uEmail: 'valeria.aguilar@gmail.com',   estado: 'pendiente' },
  ];

  await upsertMany('Accesos a recursos', accesosData, async (a) => {
    const enlaceId  = enlaceMap[a.enlace];
    const usuarioId = userMap[a.uEmail];
    if (!enlaceId || !usuarioId) throw new Error(`FK faltante: ${a.enlace}`);
    await prisma.accesoRecurso.upsert({
      where: { unique_usuario_enlace: { usuarioId, enlaceId } },
      update: {},
      create: { enlaceId, usuarioId, estado: a.estado },
    });
  });

  const accesoMap = {};
  const accesosDB = await prisma.accesoRecurso.findMany({ select: { id: true, usuarioId: true, enlaceId: true } });
  for (const a of accesosDB) accesoMap[`${a.usuarioId}_${a.enlaceId}`] = a.id;

  const getAccesoId = (uEmail, eTitulo) => {
    const uid = userMap[uEmail];
    const eid = enlaceMap[eTitulo];
    return accesoMap[`${uid}_${eid}`];
  };

  // ── 16. PAGOS DE ACCESO ─────────────────────────────────────
  const colab3 = userMap['sofia.mendoza@capyme.mx'];
  const colab4 = userMap['diego.flores@capyme.mx'];

  const pagosAccesoData = [
    { uEmail:'roberto.gutierrez@gmail.com', enlace:'Compendio de Apoyos y Programas en México 2024',            ref:'PAGACC-2024-0001', monto:199, tipo:'spei',     estado:'confirmado', conf: colab3 },
    { uEmail:'laura.castillo@hotmail.com',  enlace:'Compendio de Apoyos y Programas en México 2024',            ref:'PAGACC-2024-0002', monto:199, tipo:'efectivo', estado:'confirmado', conf: colab3 },
    { uEmail:'fernanda.ortiz@gmail.com',    enlace:'Compendio de Apoyos y Programas en México 2024',            ref:'PAGACC-2024-0003', monto:199, tipo:'spei',     estado:'confirmado', conf: colab4 },
    { uEmail:'roberto.gutierrez@gmail.com', enlace:'Compendio de Fondos para Organizaciones Sin Fines de Lucro',ref:'PAGACC-2024-0004', monto:199, tipo:'spei',     estado:'confirmado', conf: colab3 },
    { uEmail:'hector.moreno@empresa.mx',    enlace:'Compendio de Apoyos de Vivienda en México 2024',            ref:'PAGACC-2024-0005', monto:199, tipo:'spei',     estado:'confirmado', conf: colab4 },
    { uEmail:'jorge.hernandez@hotmail.com', enlace:'Compendio de Apoyos de Vivienda en México 2024',            ref:'PAGACC-2024-0006', monto:199, tipo:'efectivo', estado:'confirmado', conf: colab4 },
    { uEmail:'claudia.ruiz@gmail.com',      enlace:'Compendio de Fondos para Organizaciones Sin Fines de Lucro',ref:'PAGACC-2024-0007', monto:199, tipo:'spei',     estado:'pendiente',  conf: null },
    { uEmail:'valeria.aguilar@gmail.com',   enlace:'Compendio de Apoyos y Programas en México 2024',            ref:'PAGACC-2024-0008', monto:199, tipo:'spei',     estado:'pendiente',  conf: null },
  ];

  await upsertMany('Pagos de acceso a recursos', pagosAccesoData, async (p) => {
    const accesoId = getAccesoId(p.uEmail, p.enlace);
    if (!accesoId) throw new Error(`Acceso no encontrado: ${p.uEmail} / ${p.enlace.slice(0,30)}`);
    const existe = await prisma.pagoAccesoRecurso.findUnique({ where: { accesoId } });
    if (existe) throw new Error('ya existe');
    await prisma.pagoAccesoRecurso.create({
      data: {
        accesoId,
        referencia:        p.ref,
        monto:             p.monto,
        tipoPago:          p.tipo,
        estadoPago:        p.estado,
        confirmadoPor:     p.conf,
        fechaConfirmacion: p.estado === 'confirmado' ? new Date() : null,
        notas:             p.estado === 'confirmado' ? 'Confirmado durante seed.' : 'Pendiente de verificar.',
      },
    });
  });

  // ── 17. AVISOS ───────────────────────────────────────────────
  const avisosData = [
    { titulo: '¡Nuevo Catálogo de Apoyos 2024 disponible!', contenido: 'Ya puedes adquirir el Compendio de Apoyos y Programas en México 2024. Incluye más de 200 programas actualizados. Precio especial de lanzamiento: $199 MXN.', tipo: 'informativo', destinatario: 'todos', linkExterno: 'https://www.capyme.mx/catalogo/apoyos-programas-mexico-2024', fechaExpiracion: new Date('2024-12-31'), creadoPor: adminId },
    { titulo: 'Convocatoria abierta: Fondo PyME INADEM 2024', contenido: 'El Fondo PyME tiene convocatoria abierta hasta el 30 de junio. ¡Postúlate ahora! CAPYME te acompaña en el proceso.', tipo: 'urgente', destinatario: 'clientes', linkExterno: 'https://www.capyme.mx/programas/fondo-pyme-2024', fechaExpiracion: new Date('2024-06-30'), creadoPor: adminId },
    { titulo: 'Taller gratuito: Formalización Empresarial – 5 de abril', contenido: 'Taller presencial gratuito sobre cómo formalizar tu negocio. Lugar: Oficinas CAPYME. Cupo limitado a 25 personas.', tipo: 'evento', destinatario: 'clientes', linkExterno: null, fechaExpiracion: new Date('2024-04-05'), creadoPor: colabSofia },
    { titulo: 'Recordatorio: Vence plazo declaración anual personas físicas', contenido: 'El SAT tiene como fecha límite el 30 de abril para la declaración anual de personas físicas con actividad empresarial.', tipo: 'recordatorio', destinatario: 'clientes', linkExterno: 'https://www.sat.gob.mx', fechaExpiracion: new Date('2024-04-30'), creadoPor: admin2Id },
    { titulo: 'Reunión interna: Actualización de procesos de postulación', contenido: 'Se convoca a todos los colaboradores a reunión el martes 23 de abril a las 10:00 hrs en sala de juntas.', tipo: 'evento', destinatario: 'colaboradores', linkExterno: null, fechaExpiracion: new Date('2024-04-23'), creadoPor: adminId },
  ];

  await upsertMany('Avisos', avisosData, async (a) => {
    const existe = await prisma.aviso.findFirst({ where: { titulo: a.titulo } });
    if (existe) throw new Error('ya existe');
    await prisma.aviso.create({ data: { ...a, activo: true } });
  });

  // ── 18. NOTIFICACIONES ───────────────────────────────────────
  const notifData = [
    { uEmail: 'roberto.gutierrez@gmail.com', tipo: 'postulacion_aprobada',  titulo: 'Tu postulación fue aprobada',     mensaje: 'Tu postulación al Fondo PyME INADEM 2024 fue aprobada. Un asesor CAPYME se pondrá en contacto contigo.', leida: true },
    { uEmail: 'enrique.vargas@outlook.com',  tipo: 'postulacion_aprobada',  titulo: 'Tu postulación fue aprobada',     mensaje: 'Tu empresa fue validada para el programa Jóvenes Construyendo el Futuro.', leida: true },
    { uEmail: 'patricia.jimenez@gmail.com',  tipo: 'postulacion_aprobada',  titulo: 'Tu postulación fue aprobada',     mensaje: 'Tu postulación al Programa de Apoyo a la Mujer Empresaria fue aprobada por $28,000 MXN.', leida: true },
    { uEmail: 'jorge.hernandez@hotmail.com', tipo: 'postulacion_rechazada', titulo: 'Tu postulación no fue aprobada',  mensaje: 'Tu postulación al Programa Mujer Empresaria no cumplió los requisitos de elegibilidad.', leida: true },
    { uEmail: 'laura.castillo@hotmail.com',  tipo: 'postulacion_revision',  titulo: 'Tu postulación está en revisión', mensaje: 'Tu expediente para el Fondo PyME está siendo revisado.', leida: false },
    { uEmail: 'roberto.gutierrez@gmail.com', tipo: 'pago_confirmado',       titulo: 'Pago confirmado – Catálogo',      mensaje: 'Hemos confirmado tu pago por el Compendio de Apoyos y Programas 2024. Ya puedes descargarlo.', leida: true },
    { uEmail: 'hector.moreno@empresa.mx',    tipo: 'pago_confirmado',       titulo: 'Pago confirmado – Catálogo',      mensaje: 'Tu pago por el Compendio de Vivienda fue confirmado. Accede al recurso desde tu cuenta.', leida: true },
    { uEmail: 'enrique.vargas@outlook.com',  tipo: 'pago_confirmado',       titulo: 'Pago confirmado – Curso',         mensaje: 'Tu inscripción al curso Finanzas para PYMES ha sido confirmada. El curso inicia el 6 de mayo.', leida: true },
    { uEmail: 'roberto.gutierrez@gmail.com', tipo: 'curso_completado',      titulo: 'Completaste el curso',            mensaje: '¡Felicidades! Completaste el Taller de Formalización Empresarial con calificación 90/100.', leida: true },
    { uEmail: 'fernanda.ortiz@gmail.com',    tipo: 'curso_completado',      titulo: 'Completaste el curso',            mensaje: '¡Felicidades! Completaste el Taller de Formalización Empresarial con calificación 95/100.', leida: true },
    { uEmail: 'roberto.gutierrez@gmail.com', tipo: 'nuevo_aviso',           titulo: 'Nuevo aviso disponible',          mensaje: 'Se publicó un aviso: Convocatoria abierta Fondo PyME INADEM 2024.', leida: true },
    { uEmail: 'laura.castillo@hotmail.com',  tipo: 'nuevo_aviso',           titulo: 'Nuevo aviso disponible',          mensaje: 'Se publicó un aviso: Convocatoria abierta Fondo PyME INADEM 2024.', leida: false },
  ];

  await upsertMany('Notificaciones', notifData, async (n) => {
    const usuarioId = userMap[n.uEmail];
    if (!usuarioId) throw new Error(`Usuario no encontrado: ${n.uEmail}`);
    await prisma.notificacion.create({
      data: { usuarioId, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje, leida: n.leida },
    });
  });

  // ── 19. RESUMEN FINAL ────────────────────────────────────────
  console.log(`\n${c.bold}${c.green}╔════════════════════════════════════════╗`);
  console.log(`║         Seed completado ✔              ║`);
  console.log(`╚════════════════════════════════════════╝${c.reset}\n`);

  const counts = await Promise.all([
    prisma.usuario.count(),
    prisma.negocio.count(),
    prisma.programa.count(),
    prisma.postulacion.count(),
    prisma.curso.count(),
    prisma.inscripcionCurso.count(),
    prisma.enlaceRecurso.count(),
    prisma.accesoRecurso.count(),
    prisma.aviso.count(),
    prisma.notificacion.count(),
    prisma.trabajadorJCF.count(),
  ]);

  const labels = ['Usuarios','Negocios','Programas','Postulaciones','Cursos','Inscripciones','Recursos','Accesos','Avisos','Notificaciones','TrabajadoresJCF'];
  labels.forEach((l, i) => info(`${l.padEnd(18)}: ${counts[i]}`));
  console.log('');
}

main()
  .catch((e) => {
    err(`Error fatal: ${e.message}`);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });