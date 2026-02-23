const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');

const obtenerUsuarios = async (req, res) => {
  try {
    const { rol, activo } = req.query;
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        fechaRegistro: true,
        ultimaSesion: true
      },
      orderBy: { fechaRegistro: 'desc' }
    });

    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        fechaRegistro: true,
        fotoPerfilUrl: true
      }
    });

    res.json({ success: true, data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        fechaRegistro: true,
        ultimaSesion: true,
        fotoPerfilUrl: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuario', error: error.message });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, rol, password } = req.body;

    if (req.user.rol === 'colaborador' && rol === 'admin') {
      return res.status(403).json({ success: false, message: 'Un colaborador no puede crear usuarios administradores' });
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        rol: rol || 'cliente',
        password: hashedPassword
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true,
        fechaRegistro: true
      }
    });

    res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear usuario', error: error.message });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const { nombre, apellido, telefono, password, fotoPerfilUrl } = req.body;
    const dataActualizar = {};
    if (nombre) dataActualizar.nombre = nombre;
    if (apellido) dataActualizar.apellido = apellido;
    if (telefono) dataActualizar.telefono = telefono;
    if (fotoPerfilUrl) dataActualizar.fotoPerfilUrl = fotoPerfilUrl;
    if (password) dataActualizar.password = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id: req.user.id },
      data: dataActualizar,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        fotoPerfilUrl: true
      }
    });

    res.json({ success: true, message: 'Perfil actualizado exitosamente', data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar perfil', error: error.message });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, rol, activo, password } = req.body;
    const id = parseInt(req.params.id);

    if (req.user.rol === 'colaborador') {
      const usuarioObjetivo = await prisma.usuario.findUnique({ where: { id } });
      if (!usuarioObjetivo) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      if (usuarioObjetivo.rol === 'admin') {
        return res.status(403).json({ success: false, message: 'Un colaborador no puede modificar usuarios administradores' });
      }
      if (rol === 'admin') {
        return res.status(403).json({ success: false, message: 'Un colaborador no puede asignar el rol de administrador' });
      }
    }

    const dataActualizar = { nombre, apellido, email, telefono, rol, activo };
    if (password) dataActualizar.password = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.update({
      where: { id },
      data: dataActualizar,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true,
        rol: true,
        activo: true
      }
    });

    res.json({ success: true, message: 'Usuario actualizado exitosamente', data: usuario });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.usuario.delete({ where: { id } });
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario', error: error.message });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerPerfil,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarPerfil,
  actualizarUsuario,
  eliminarUsuario
};  