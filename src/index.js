const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection } = require('./config/database');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const negociosRoutes = require('./routes/negocios.routes');
const programasRoutes = require('./routes/programas.routes');
const cursosRoutes = require('./routes/cursos.routes');
const avisosRoutes = require('./routes/avisos.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const postulacionesRoutes = require('./routes/postulaciones.routes');
const enlacesRoutes = require('./routes/enlaces.routes');
const contactoRoutes = require('./routes/contacto.routes');
const financiamientoRoutes = require('./routes/financiamiento.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const preguntasRoutes = require('./routes/preguntas.routes');
const trabajadoresRoutes = require('./routes/trabajadores.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API CAPYME funcionando correctamente' 
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/programas', programasRoutes);
app.use('/api/cursos', cursosRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/enlaces', enlacesRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/financiamiento', financiamientoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/preguntas', preguntasRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});

module.exports = app;