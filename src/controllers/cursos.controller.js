const { prisma } = require('../config/database');

const parseFecha = (s) => s ? new Date(`${s}T12:00:00.000Z`) : null;


const genRef = () => `REF${Date.now().toString().slice(-10)}${Math.floor(Math.random()*99999999).toString().padStart(8,'0')}`.slice(0,18);

const obtenerCursos = async (req, res) => {
  try {
    const { activo, modalidad } = req.query;
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (modalidad) where.modalidad = modalidad;

    const cursos = await prisma.curso.findMany({
      where,
      include: {
        creador: { select: { id: true, nombre: true, apellido: true } },
        inscripciones: { select: { id: true, usuarioId: true, pago: { select: { estadoPago: true } } } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    const uid = req.user?.id, esCliente = req.user?.rol === 'cliente';

    const data = cursos.map(c => {
      const confirmados = c.inscripciones.filter(i => !i.pago || i.pago.estadoPago === 'confirmado').length;
      let miPagoPendiente = false, yaInscrito = false;
      if (esCliente && uid) {
        const mi = c.inscripciones.find(i => i.usuarioId === uid);
        if (mi) { if (mi.pago?.estadoPago === 'pendiente') miPagoPendiente = true; else yaInscrito = true; }
      }
      return { ...c, inscritosCount: confirmados, inscripciones: undefined, miPagoPendiente, yaInscrito };
    });

    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener cursos', error: error.message }); }
};

const obtenerCursoPorId = async (req, res) => {
  try {
    const curso = await prisma.curso.findUnique({ where: { id: parseInt(req.params.id) }, include: { creador: { select: { id:true,nombre:true,apellido:true } }, inscripciones: { select: { id:true,estado:true,usuario:{ select:{ id:true,nombre:true,apellido:true } } } } } });
    if (!curso) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    res.json({ success: true, data: curso });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const crearCurso = async (req, res) => {
  try {
    const { activo, fechaInicio, fechaFin, ...data } = req.body;
    const curso = await prisma.curso.create({ data: { ...data, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin), creadoPor: req.user.id }, include: { creador: { select:{ id:true,nombre:true,apellido:true } } } });
    await log(req.user.id, 'CREATE', curso.id, `Curso creado: "${curso.titulo}"`, req.ip);
    res.status(201).json({ success: true, message: 'Curso creado exitosamente', data: curso });
  } catch (error) { res.status(500).json({ success: false, message: 'Error al crear curso', error: error.message }); }
};

const actualizarCurso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!await prisma.curso.findUnique({ where: { id } })) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    const { activo, fechaInicio, fechaFin, ...rest } = req.body;
    const curso = await prisma.curso.update({ where: { id }, data: { ...rest, fechaInicio: parseFecha(fechaInicio), fechaFin: parseFecha(fechaFin) }, include: { creador: { select:{ id:true,nombre:true,apellido:true } } } });
    await log(req.user.id, 'UPDATE', curso.id, `Curso actualizado: "${curso.titulo}"`, req.ip);
    res.json({ success: true, message: 'Curso actualizado exitosamente', data: curso });
  } catch (error) { res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message }); }
};

const toggleActivoCurso = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ex = await prisma.curso.findUnique({ where: { id } });
    if (!ex) return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    const curso = await prisma.curso.update({ where: { id }, data: { activo: !ex.activo }, include: { creador: { select:{ id:true,nombre:true,apellido:true } } } });
    await log(req.user.id, 'TOGGLE_ACTIVO', curso.id, `Curso ${curso.activo?'activado':'desactivado'}: "${curso.titulo}"`, req.ip);
    res.json({ success: true, message: `Curso ${curso.activo?'activado':'desactivado'} exitosamente`, data: curso });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const obtenerInscritos = async (req, res) => {
  try {
    const inscritos = await prisma.inscripcionCurso.findMany({
      where: { cursoId: parseInt(req.params.id) },
      include: {
        usuario: { select: { id:true,nombre:true,apellido:true,email:true,telefono:true } },
        negocio: { select: { id:true,nombreNegocio:true } },
        pago:    { select: { estadoPago:true,referencia:true,monto:true,mercadoPagoId:true } },
      },
      orderBy: { fechaInscripcion: 'desc' },
    });
    res.json({ success: true, data: inscritos });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const inscribirCurso = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id), { negocioId } = req.body;

    const curso = await prisma.curso.findUnique({ where: { id: cursoId }, include: { inscripciones: { include: { pago: { select:{ estadoPago:true,referencia:true,monto:true } } } } } });
    if (!curso)          return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    if (!curso.activo)   return res.status(400).json({ success: false, message: 'Este curso no está disponible' });

    const confirmados = curso.inscripciones.filter(i => !i.pago || i.pago.estadoPago === 'confirmado').length;
    if (curso.cupoMaximo && confirmados >= curso.cupoMaximo)
      return res.status(400).json({ success: false, message: 'El curso ha alcanzado el cupo máximo' });

    const costo = curso.costo ? parseFloat(curso.costo) : 0;
    const requierePago = costo > 0;

    const ex = await prisma.inscripcionCurso.findUnique({ where: { unique_usuario_curso: { usuarioId: req.user.id, cursoId } }, include: { pago: true } });
    if (ex) {
      if (!ex.pago || ex.pago.estadoPago === 'confirmado')
        return res.status(400).json({ success: false, message: 'Ya estás inscrito en este curso' });

      if (ex.pago.estadoPago === 'pendiente')
        return res.json({
          success: true, message: 'Reanudando pago pendiente',
          data: { id: ex.id, curso: { id: curso.id, titulo: curso.titulo, costo: curso.costo } },
          requierePago: true,
          pagoInfo: { referencia: ex.pago.referencia, monto: ex.pago.monto, tituloCurso: curso.titulo },
          esReanudacion: true,
        });
    }

    const inscripcion = await prisma.inscripcionCurso.create({
      data: { cursoId, usuarioId: req.user.id, negocioId: negocioId || null, estado: 'inscrito' },
      include: { curso: { select:{ id:true,titulo:true,costo:true } }, usuario: { select:{ id:true,nombre:true,apellido:true,email:true } } },
    });

    let pagoInfo = null;
    if (requierePago) {
      const ref = genRef();
      await prisma.pagoInscripcion.create({ data: { inscripcionId: inscripcion.id, referencia: ref, monto: costo, tipoPago: 'spei', estadoPago: 'pendiente' } });
      pagoInfo = { referencia: ref, monto: costo, tituloCurso: curso.titulo };
    }

    const admins = await prisma.usuario.findMany({ where: { rol: 'admin', activo: true }, select: { id: true } });
    const nombre = `${inscripcion.usuario.nombre} ${inscripcion.usuario.apellido}`;
    if (admins.length > 0) {
      await prisma.notificacion.createMany({ data: admins.map(a => ({ usuarioId: a.id, tipo: requierePago?'inscripcion_pendiente_pago':'nueva_inscripcion', titulo: requierePago?'Nueva solicitud de inscripción':'Nueva inscripción', mensaje: requierePago?`${nombre} inició inscripción al curso "${curso.titulo}".`:`${nombre} se inscribió al curso gratuito "${curso.titulo}".`, leida: false })) });
    }

    res.status(201).json({ success: true, message: requierePago?'Inscripción iniciada. Completa tu pago.':'Inscripción realizada exitosamente', data: inscripcion, requierePago, pagoInfo, esReanudacion: false });
  } catch (error) { res.status(500).json({ success: false, message: 'Error al inscribir', error: error.message }); }
};

const obtenerMiPago = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id);
    const insc = await prisma.inscripcionCurso.findUnique({ where: { unique_usuario_curso: { usuarioId: req.user.id, cursoId } }, include: { pago: true, curso: { select:{ id:true,titulo:true,costo:true } } } });
    if (!insc) return res.status(404).json({ success: false, message: 'No tienes inscripción para este curso' });
    if (!insc.pago) return res.json({ success: true, data: { tienePago: false } });
    res.json({ success: true, data: { tienePago: true, referencia: insc.pago.referencia, monto: insc.pago.monto, estadoPago: insc.pago.estadoPago, tituloCurso: insc.curso.titulo } });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const confirmarPorReferencia = async (req, res) => {
  try {
    const { referencia } = req.body;
    if (!referencia) return res.status(400).json({ success: false, message: 'Referencia requerida' });

    const pago = await prisma.pagoInscripcion.findUnique({
      where: { referencia: String(referencia) },
      include: { inscripcion: { include: { usuario: { select:{ id:true } }, curso: { select:{ titulo:true } } } } },
    });

    if (!pago) return res.json({ success: true, message: 'Pago no encontrado', yaConfirmado: false });
    if (pago.estadoPago === 'confirmado') return res.json({ success: true, message: 'Ya confirmado', yaConfirmado: true });

    await prisma.pagoInscripcion.update({ where: { id: pago.id }, data: { estadoPago: 'confirmado', fechaConfirmacion: new Date() } });

    await prisma.notificacion.create({ data: { usuarioId: pago.inscripcion.usuario.id, tipo: 'pago_confirmado', titulo: 'Pago confirmado', mensaje: `Tu pago para el curso "${pago.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`, leida: false } });
    await log(pago.inscripcion.usuario.id, 'CONFIRMAR_PAGO_BACKURL', pago.inscripcionId, `Pago confirmado vía back_url: ref. ${referencia}`, req.ip);

    res.json({ success: true, message: 'Pago confirmado exitosamente', yaConfirmado: true });
  } catch (error) { res.status(500).json({ success: false, message: 'Error al confirmar pago', error: error.message }); }
};

const obtenerPagosPendientes = async (req, res) => {
  try {
    const pagos = await prisma.pagoInscripcion.findMany({
      where: { estadoPago: 'pendiente' },
      include: { inscripcion: { include: { usuario: { select:{ id:true,nombre:true,apellido:true,email:true,telefono:true } }, curso: { select:{ id:true,titulo:true,costo:true } }, negocio: { select:{ id:true,nombreNegocio:true } } } } },
      orderBy: { fechaCreacion: 'desc' },
    });
    res.json({ success: true, data: pagos });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const confirmarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);
    const pago = await prisma.pagoInscripcion.findUnique({ where: { id } });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago === 'confirmado') return res.status(400).json({ success: false, message: 'Este pago ya fue confirmado' });
    const p = await prisma.pagoInscripcion.update({ where: { id }, data: { estadoPago: 'confirmado', confirmadoPor: req.user.id, fechaConfirmacion: new Date() }, include: { inscripcion: { include: { usuario: { select:{ id:true,nombre:true,apellido:true } }, curso: { select:{ titulo:true } } } } } });
    await prisma.notificacion.create({ data: { usuarioId: p.inscripcion.usuario.id, tipo: 'pago_confirmado', titulo: 'Pago confirmado', mensaje: `Tu pago para el curso "${p.inscripcion.curso.titulo}" fue confirmado.`, leida: false } });
    await log(req.user.id, 'CONFIRMAR_PAGO_MANUAL', pago.inscripcionId, `Pago confirmado manualmente: ref. ${pago.referencia}`, req.ip);
    res.json({ success: true, message: 'Pago confirmado', data: p });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

const declinarPago = async (req, res) => {
  try {
    const id = parseInt(req.params.pagoId);
    const pago = await prisma.pagoInscripcion.findUnique({ where: { id }, include: { inscripcion: { include: { usuario: { select:{ id:true } }, curso: { select:{ titulo:true } } } } } });
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estadoPago !== 'pendiente') return res.status(400).json({ success: false, message: 'Solo se pueden declinar pagos pendientes' });
    const uid = pago.inscripcion.usuario.id, tit = pago.inscripcion.curso.titulo;
    await prisma.pagoInscripcion.delete({ where: { id } });
    await prisma.inscripcionCurso.delete({ where: { id: pago.inscripcionId } });
    await prisma.notificacion.create({ data: { usuarioId: uid, tipo: 'inscripcion_declinada', titulo: 'Inscripción declinada', mensaje: `Tu inscripción al curso "${tit}" fue declinada.`, leida: false } });
    await log(req.user.id, 'DECLINAR_PAGO', pago.inscripcionId, `Inscripción declinada en "${tit}"`, req.ip);
    res.json({ success: true, message: 'Inscripción declinada' });
  } catch (error) { res.status(500).json({ success: false, message: 'Error', error: error.message }); }
};

module.exports = { obtenerCursos, obtenerCursoPorId, crearCurso, actualizarCurso, toggleActivoCurso, obtenerInscritos, inscribirCurso, obtenerMiPago, confirmarPorReferencia, obtenerPagosPendientes, confirmarPago, declinarPago };