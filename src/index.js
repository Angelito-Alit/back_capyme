const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { sanitizeBody }   = require('./middlewares/sanitize.middleware');
const { generalLimiter } = require('./middlewares/rateLimit.middleware');
const { errorHandler }   = require('./middlewares/errorHandler');

const authRoutes           = require('./routes/auth.routes');
const usuariosRoutes       = require('./routes/usuarios.routes');
const negociosRoutes       = require('./routes/negocios.routes');
const programasRoutes      = require('./routes/programas.routes');
const cursosRoutes         = require('./routes/cursos.routes');
const avisosRoutes         = require('./routes/avisos.routes');
const categoriasRoutes     = require('./routes/categorias.routes');
const postulacionesRoutes  = require('./routes/postulaciones.routes');
const enlacesRoutes        = require('./routes/enlaces.routes');
const contactoRoutes       = require('./routes/contacto.routes');
const dashboardRoutes      = require('./routes/dashboard.routes');
const preguntasRoutes      = require('./routes/preguntas.routes');
const trabajadoresRoutes   = require('./routes/trabajadores.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const jcfRoutes            = require('./routes/jcf.routes');
const campanasRoutes       = require('./routes/campanas.routes');
const inversionesRoutes    = require('./routes/inversiones.routes');
const pagosRoutes          = require('./routes/pagos.routes');
const campanasAdminRoutes = require('./routes/campanasAdmin.routes.js'); 

const pagosController = require('./controllers/pagos.controller');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(generalLimiter);
app.use(sanitizeBody);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'API CAPYME funcionando correctamente' });
});

app.post('/api/pagos/webhook', pagosController.webhook);
app.use('/api/auth',           authRoutes);
app.use('/api/usuarios',       usuariosRoutes);
app.use('/api/negocios',       negociosRoutes);
app.use('/api/programas',      programasRoutes);
app.use('/api/cursos',         cursosRoutes);
app.use('/api/avisos',         avisosRoutes);
app.use('/api/categorias',     categoriasRoutes);
app.use('/api/postulaciones',  postulacionesRoutes);
app.use('/api/enlaces',        enlacesRoutes);
app.use('/api/contacto',       contactoRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/preguntas',      preguntasRoutes);
app.use('/api/trabajadores',   trabajadoresRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/jcf',            jcfRoutes);
app.use('/api/campanas',       campanasRoutes);
app.use('/api/inversiones',    inversionesRoutes);
app.use('/api/pagos',          pagosRoutes);
app.use('/api/admin/campanas', campanasAdminRoutes)

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});

module.exports = app;