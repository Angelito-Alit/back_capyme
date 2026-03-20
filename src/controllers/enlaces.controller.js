const { prisma } = require('../config/database');

const log = async (usuarioId, accion, registroId, descripcion, ip) => {
  try {
    await prisma.historialAccion.create({
      data: { usuarioId, accion, tablaAfectada: 'enlaces', registroId, descripcion, ipAddress: ip || null },
    });
  } catch {}
};

const genRef = () =>
  `RESR${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 99999999)
    .toString()
    .padStart(8, '0')}`.slice(0, 18);

const obtenerEnlaces = async (req, res) => {
  try {
    const { activo, tipo, categoria, visiblePara } = req.query;
    const where = {};

    if (activo !== undefined) where.activo = activo === 'true' || activo === true;
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;

    if (req.user?.rol === 'cliente') {
      where.visiblePara = { in: ['todos', 'clientes'] };
    } else if (visiblePara) {
      where.visiblePara = visiblePara;
    }

    const enlaces = await prisma.enlaceRecurso.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { accesos: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    const uid = req.user?.id;
    const esCliente = req.user?.rol === 'cliente';

    const data = await Promise.all(
      enlaces.map(async (e) => {
        let miAcceso = null;
        if (esCliente && uid) {
          const acceso = await prisma.accesoRecurso.findFirst({
            where: { enlaceId: e.id, usuarioId: uid },
            include: { pago: { select: { estadoPago: true, referencia: true, monto: true } } },
          });
          if (acceso) {
            miAcceso = {
              estado: acceso.estado,
              estadoPago: acceso.pago?.estadoPago || null,
              pago: acceso.pago,
            };
          }
        }
        return { ...e, accesosCount: e._count.accesos, _count: undefined, miAcceso };
      })
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error('[obtenerEnlaces]', error);
    res.status(500).json({ success: false, message: 'Error al obtener catálogos', error: error.message });
  }
};

const obtenerEnlacePorId = async (req, res) => {
  try {
    const enlace = await prisma.enlaceRecurso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (!enlace) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    res.json({ success: true, data: enlace });
  } catch (error) {
    console.error('[obtenerEnlacePorId]', error);
    res.status(500).json({ success: false, message: 'Error al obtener catálogo', error: error.message });
  }
};

const crearEnlace = async (req, res) => {
  try {
    const { titulo, descripcion, url, tipo, categoria, visiblePara, costo } = req.body;

    if (!titulo || !url) {
      return res.status(400).json({ success: false, message: 'Título y URL son requeridos' });
    }

    const data = {
      titulo,
      url,
      tipo: tipo || 'otro',
      visiblePara: visiblePara || 'todos',
      costo: costo != null ? parseFloat(costo) : 0,
      creadoPor: req.user.id,
    };

    if (descripcion) data.descripcion = descripcion;
    if (categoria) data.categoria = categoria;

    const enlace = await prisma.enlaceRecurso.create({
      data,
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });

    await log(req.user.id, 'CREATE', enlace.id, `Catálogo creado: "${enlace.titulo}"`, req.ip);

    res.status(201).json({ success: true, message: 'Catálogo creado exitosamente', data: enlace });
  } catch (error) {
    console.error('[crearEnlace]', error);
    res.status(500).json({ success: false, message: 'Error al crear catálogo', error: error.message });
  }
};

const actualizarEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descripcion, url, tipo, categoria, visiblePara, costo } = req.body;

    const data = {};
    if (titulo !== undefined) data.titulo = titulo;
    if (url !== undefined) data.url = url;
    if (tipo !== undefined) data.tipo = tipo;
    if (visiblePara !== undefined) data.visiblePara = visiblePara;
    if (costo !== undefined) data.costo = parseFloat(costo) || 0;
    if (descripcion !== undefined) data.descripcion = descripcion || null;
    if (categoria !== undefined) data.categoria = categoria || null;

    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data,
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });

    await log(req.user.id, 'UPDATE', enlace.id, `Catálogo actualizado: "${enlace.titulo}"`, req.ip);

    res.json({ success: true, message: 'Catálogo actualizado exitosamente', data: enlace });
  } catch (error) {
    console.error('[actualizarEnlace]', error);
    res.status(500).json({ success: false, message: 'Error al actualizar catálogo', error: error.message });
  }
};

const toggleActivoEnlace = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ex = await prisma.enlaceRecurso.findUnique({ where: { id } });
    if (!ex) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });

    const enlace = await prisma.enlaceRecurso.update({
      where: { id },
      data: { activo: !ex.activo },
      include: { creador: { select: { id: true, nombre: true, apellido: true } } },
    });

    await log(
      req.user.id, 'TOGGLE_ACTIVO', enlace.id,
      `Catálogo ${enlace.activo ? 'activado' : 'desactivado'}: "${enlace.titulo}"`, req.ip
    );

    res.json({
      success: true,
      message: `Catálogo ${enlace.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: enlace,
    });
  } catch (error) {
    console.error('[toggleActivoEnlace]', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: error.message });
  }
};

const solicitarAcceso = async (req, res) => {
  try {
    const enlaceId = parseInt(req.params.id);
    const uid = req.user.id;

    const enlace = await prisma.enlaceRecurso.findUnique({ where: { id: enlaceId } });
    if (!enlace) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
    if (!enlace.activo) return res.status(400).json({ success: false, message: 'Este catálogo no está disponible' });

    const costo = enlace.costo ? parseFloat(enlace.costo) : 0;
    const requierePago = costo > 0;

    const ex = await prisma.accesoRecurso.findFirst({
      where: { enlaceId, usuarioId: uid },
      include: { pago: true },
    });

    if (ex) {
      if (ex.estado === 'activo') {
        return res.status(400).json({ success: false, message: 'Ya tienes acceso a este recurso' });
      }

      if (ex.estado === 'pendiente' && ex.pago?.estadoPago === 'pendiente') {
        return res.json({
          success: true,
          message: 'Reanudando pago pendiente',
          requierePago: true,
          pagoInfo: {
            referencia: ex.pago.referencia,
            monto: ex.pago.monto,
            tituloRecurso: enlace.titulo,
          },
          esReanudacion: true,
        });
      }
    }

    const acceso = await prisma.accesoRecurso.create({
      data: {
        enlaceId,
        usuarioId: uid,
        estado: requierePago ? 'pendiente' : 'activo',
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        enlace: { select: { titulo: true } },
      },
    });

    let pagoInfo = null;

    if (requierePago) {
      const ref = genRef();
      await prisma.pagoAccesoRecurso.create({
        data: {
          accesoId: acceso.id,
          referencia: ref,
          monto: costo,
          tipoPago: 'spei',
          estadoPago: 'pendiente',
        },
      });

      pagoInfo = { referencia: ref, monto: costo, tituloRecurso: enlace.titulo };

      const admins = await prisma.usuario.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notificacion.createMany({
          data: admins.map((a) => ({
            usuarioId: a.id,
            tipo: 'acceso_recurso_pendiente',
            titulo: 'Nueva solicitud de acceso',
            mensaje: `${acceso.usuario.nombre} ${acceso.usuario.apellido} solicitó acceso a "${enlace.titulo}".`,
            leida: false,
          })),
        });
      }
    } else {
      await prisma.notificacion.create({
        data: {
          usuarioId: uid,
          tipo: 'acceso_otorgado',
          titulo: 'Acceso otorgado',
          mensaje: `Ya tienes acceso a "${enlace.titulo}".`,
          leida: false,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: requierePago ? 'Solicitud registrada. Completa tu pago.' : '¡Acceso otorgado!',
      data: acceso,
      requierePago,
      pagoInfo,
      esReanudacion: false,
    });
  } catch (error) {
    console.error('[solicitarAcceso]', error);
    res.status(500).json({ success: false, message: 'Error al solicitar acceso', error: error.message });
  }
};

const confirmarPorReferencia = async (req, res) => {
  try {
    const { referencia } = req.body;
    if (!referencia) return res.status(400).json({ success: false, message: 'Referencia requerida' });

    const pago = await prisma.pagoAccesoRecurso.findUnique({
      where: { referencia: String(referencia) },
      include: {
        acceso: {
          include: {
            usuario: { select: { id: true } },
            enlace: { select: { titulo: true } },
          },
        },
      },
    });

    if (!pago) return res.json({ success: true, message: 'Pago no encontrado', yaConfirmado: false });
    if (pago.estadoPago === 'confirmado') return res.json({ success: true, message: 'Ya confirmado', yaConfirmado: true });

    await prisma.$transaction([
      prisma.pagoAccesoRecurso.update({
        where: { id: pago.id },
        data: { estadoPago: 'confirmado', fechaConfirmacion: new Date() },
      }),
      prisma.accesoRecurso.update({
        where: { id: pago.accesoId },
        data: { estado: 'activo' },
      }),
    ]);

    await prisma.notificacion.create({
      data: {
        usuarioId: pago.acceso.usuario.id,
        tipo: 'acceso_otorgado',
        titulo: 'Acceso confirmado',
        mensaje: `Tu pago para "${pago.acceso.enlace.titulo}" fue confirmado. ¡Ya tienes acceso!`,
        leida: false,
      },
    });

    res.json({ success: true, message: 'Acceso confirmado exitosamente', yaConfirmado: true });
  } catch (error) {
    console.error('[confirmarPorReferencia-enlaces]', error);
    res.status(500).json({ success: false, message: 'Error al confirmar acceso', error: error.message });
  }
};

const obtenerAccesos = async (req, res) => {
  try {
    const accesos = await prisma.accesoRecurso.findMany({
      where: { enlaceId: parseInt(req.params.id) },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        pago: { select: { estadoPago: true, referencia: true, monto: true, mercadoPagoId: true } },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
    res.json({ success: true, data: accesos });
  } catch (error) {
    console.error('[obtenerAccesos]', error);
    res.status(500).json({ success: false, message: 'Error al obtener accesos', error: error.message });
  }
};

const obtenerMiPago = async (req, res) => {
  try {
    const enlaceId = parseInt(req.params.id);
    const acceso = await prisma.accesoRecurso.findFirst({
      where: { enlaceId, usuarioId: req.user.id },
      include: {
        pago: { select: { estadoPago: true, referencia: true, monto: true } },
        enlace: { select: { titulo: true } },
      },
    });

    if (!acceso) return res.status(404).json({ success: false, message: 'Sin acceso registrado' });
    if (!acceso.pago) return res.json({ success: true, data: { tienePago: false } });

    res.json({
      success: true,
      data: {
        tienePago: true,
        referencia: acceso.pago.referencia,
        monto: acceso.pago.monto,
        estadoPago: acceso.pago.estadoPago,
        tituloRecurso: acceso.enlace.titulo,
      },
    });
  } catch (error) {
    console.error('[obtenerMiPago]', error);
    res.status(500).json({ success: false, message: 'Error al obtener pago', error: error.message });
  }
};

module.exports = {
  obtenerEnlaces,
  obtenerEnlacePorId,
  crearEnlace,
  actualizarEnlace,
  toggleActivoEnlace,
  solicitarAcceso,
  confirmarPorReferencia,
  obtenerAccesos,
  obtenerMiPago,
};