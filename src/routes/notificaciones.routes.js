const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { prisma } = require('../config/database');

router.get('/', verifyToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = req.user.rol;
    const ahora = new Date();

    const destinatariosRol = rol === 'cliente'
      ? ['clientes', 'todos']
      : rol === 'colaborador'
      ? ['colaboradores', 'todos']
      : ['todos'];

    const [notificaciones, avisos, avisosLeidosRows] = await Promise.all([
      prisma.notificacion.findMany({
        where: { usuarioId },
        orderBy: { fechaCreacion: 'desc' },
        take: 30,
      }),
      prisma.aviso.findMany({
        where: {
          activo: true,
          OR: [{ fechaExpiracion: null }, { fechaExpiracion: { gt: ahora } }],
          destinatario: { in: destinatariosRol },
        },
        orderBy: { fechaPublicacion: 'desc' },
        take: 20,
      }),
      prisma.avisoLeido.findMany({
        where: { usuarioId },
        select: { avisoId: true },
      }),
    ]);

    const avisosLeidosSet = new Set(avisosLeidosRows.map(r => r.avisoId));

    const notifItems = notificaciones.map((n) => ({
      id: `notif_${n.id}`,
      _id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      leida: n.leida,
      fecha: n.fechaCreacion,
      origen: 'notificacion',
    }));

    const avisoItems = avisos.map((a) => ({
      id: `aviso_${a.id}`,
      _id: a.id,
      tipo: a.tipo,
      titulo: a.titulo,
      mensaje: a.contenido,
      leida: avisosLeidosSet.has(a.id),
      fecha: a.fechaPublicacion,
      origen: 'aviso',
      linkExterno: a.linkExterno || null,
    }));

    const todos = [...notifItems, ...avisoItems].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    const noLeidas =
      notificaciones.filter((n) => !n.leida).length +
      avisoItems.filter((a) => !a.leida).length;

    res.json({ success: true, data: todos, noLeidas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/leer', verifyToken, async (req, res) => {
  try {
    await prisma.notificacion.update({
      where: { id: parseInt(req.params.id), usuarioId: req.user.id },
      data: { leida: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/avisos/:id/leer', verifyToken, async (req, res) => {
  try {
    await prisma.avisoLeido.upsert({
      where: { unique_usuario_aviso: { usuarioId: req.user.id, avisoId: parseInt(req.params.id) } },
      update: {},
      create: { usuarioId: req.user.id, avisoId: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/avisos/leer-varios', verifyToken, async (req, res) => {
  try {
    const { avisoIds } = req.body;
    if (!Array.isArray(avisoIds) || avisoIds.length === 0) return res.json({ success: true });
    await prisma.$transaction(
      avisoIds.map((avisoId) =>
        prisma.avisoLeido.upsert({
          where: { unique_usuario_aviso: { usuarioId: req.user.id, avisoId: parseInt(avisoId) } },
          update: {},
          create: { usuarioId: req.user.id, avisoId: parseInt(avisoId) },
        })
      )
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/leer-todas', verifyToken, async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.user.id, leida: false },
      data: { leida: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;