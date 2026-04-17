const { prisma } = require('../config/database');

const obtenerEstadisticasGenerales = async (req, res) => {
  try {
    const [
      totalNegocios,
      totalClientes,
      totalProgramas,
      postulacionesPendientes,
      postulacionesAprobadas,
      cursosDisponibles,
      totalPostulaciones,
      trabajadoresJCF
    ] = await Promise.all([
      prisma.negocio.count({ where: { activo: true } }),
      prisma.usuario.count({ where: { rol: 'cliente', activo: true } }),
      prisma.programa.count({ where: { activo: true } }),
      prisma.postulacion.count({ where: { estado: 'pendiente' } }),
      prisma.postulacion.count({ where: { estado: 'aprobada' } }),
      prisma.curso.count({ where: { activo: true } }),
      prisma.postulacion.count(),
      prisma.trabajadorJCF.count({ where: { activo: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalNegocios,
        totalClientes,
        totalProgramas,
        postulacionesPendientes,
        postulacionesAprobadas,
        cursosDisponibles,
        totalPostulaciones,
        trabajadoresJCF
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
};

const obtenerNegociosPorCategoria = async (req, res) => {
  try {
    const negociosPorCategoria = await prisma.negocio.groupBy({
      by: ['categoriaId'],
      where: { activo: true },
      _count: { id: true }
    });

    const categorias = await prisma.categoriaNegocio.findMany({
      where: { id: { in: negociosPorCategoria.map(n => n.categoriaId) } }
    });

    const resultado = negociosPorCategoria.map(item => {
      const categoria = categorias.find(c => c.id === item.categoriaId);
      return { categoria: categoria?.nombre || 'Sin categoría', total: item._count.id };
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener negocios por categoría', error: error.message });
  }
};

const obtenerPostulacionesPorEstado = async (req, res) => {
  try {
    const postulacionesPorEstado = await prisma.postulacion.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    const resultado = postulacionesPorEstado.map(item => ({
      estado: item.estado,
      total: item._count.id
    }));

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener postulaciones por estado', error: error.message });
  }
};

const obtenerPostulacionesPorPrograma = async (req, res) => {
  try {
    const postulaciones = await prisma.postulacion.groupBy({
      by: ['programaId'],
      _count: { id: true }
    });

    const programas = await prisma.programa.findMany({
      where: { id: { in: postulaciones.map(p => p.programaId) } }
    });

    const resultado = postulaciones.map(item => {
      const programa = programas.find(p => p.id === item.programaId);
      return { programa: programa?.nombre || 'Sin programa', total: item._count.id };
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerUltimosNegocios = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const negocios = await prisma.negocio.findMany({
      take: limit,
      orderBy: { fechaRegistro: 'desc' },
      include: {
        categoria: true,
        usuario: { select: { id: true, nombre: true, apellido: true, email: true } }
      }
    });
    res.json({ success: true, data: negocios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerUltimasPostulaciones = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const postulaciones = await prisma.postulacion.findMany({
      take: limit,
      orderBy: { fechaPostulacion: 'desc' },
      include: {
        negocio: { select: { id: true, nombreNegocio: true } },
        programa: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } }
      }
    });
    res.json({ success: true, data: postulaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerEstadisticasCliente = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const [misNegocios, misPostulaciones, postulacionesAprobadas, misCursos] = await Promise.all([
      prisma.negocio.count({ where: { usuarioId, activo: true } }),
      prisma.postulacion.count({ where: { usuarioId } }),
      prisma.postulacion.count({ where: { usuarioId, estado: 'aprobada' } }),
      prisma.inscripcionCurso.count({ where: { usuarioId } })
    ]);
    res.json({ success: true, data: { misNegocios, misPostulaciones, postulacionesAprobadas, misCursos } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerCursosMasInscritos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const cursos = await prisma.curso.findMany({
      where: { activo: true },
      include: { inscripciones: { select: { id: true } } }
    });
    const cursosOrdenados = cursos
      .map(curso => ({
        id: curso.id,
        titulo: curso.titulo,
        modalidad: curso.modalidad,
        inscritos: curso.inscripciones.length,
        cupoMaximo: curso.cupoMaximo
      }))
      .sort((a, b) => b.inscritos - a.inscritos)
      .slice(0, limit);
    res.json({ success: true, data: cursosOrdenados });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerPostulacionesPorMes = async (req, res) => {
  try {
    const postulaciones = await prisma.postulacion.findMany({
      select: { fechaPostulacion: true, estado: true },
      orderBy: { fechaPostulacion: 'asc' },
    });

    const mapasMes = {};
    for (const p of postulaciones) {
      const fecha = new Date(p.fechaPostulacion);
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!mapasMes[clave]) mapasMes[clave] = { mes: clave, total: 0, aprobadas: 0, pendientes: 0, rechazadas: 0 };
      mapasMes[clave].total++;
      if (p.estado === 'aprobada') mapasMes[clave].aprobadas++;
      if (p.estado === 'pendiente') mapasMes[clave].pendientes++;
      if (p.estado === 'rechazada') mapasMes[clave].rechazadas++;
    }

    const resultado = Object.values(mapasMes).slice(-12);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerNegociosPorEstado = async (req, res) => {
  try {
    const [activos, inactivos] = await Promise.all([
      prisma.negocio.count({ where: { activo: true } }),
      prisma.negocio.count({ where: { activo: false } }),
    ]);
    res.json({
      success: true,
      data: [
        { estado: 'Activos', total: activos },
        { estado: 'Inactivos', total: inactivos },
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerInscripcionesPorCurso = async (req, res) => {
  try {
    const cursos = await prisma.curso.findMany({
      where: { activo: true },
      select: {
        titulo: true,
        cupoMaximo: true,
        _count: { select: { inscripciones: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
      take: 6,
    });

    const data = cursos.map(c => ({
      titulo: c.titulo.length > 28 ? c.titulo.slice(0, 28) + '…' : c.titulo,
      inscritos: c._count.inscripciones,
      cupo: c.cupoMaximo || 0,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

const obtenerUsuariosPorRol = async (req, res) => {
  try {
    const [admins, colaboradores, clientes] = await Promise.all([
      prisma.usuario.count({ where: { rol: 'admin', activo: true } }),
      prisma.usuario.count({ where: { rol: 'colaborador', activo: true } }),
      prisma.usuario.count({ where: { rol: 'cliente', activo: true } }),
    ]);
    res.json({
      success: true,
      data: [
        { rol: 'Admins', total: admins },
        { rol: 'Colaboradores', total: colaboradores },
        { rol: 'Clientes', total: clientes },
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

module.exports = {
  obtenerEstadisticasGenerales,
  obtenerNegociosPorCategoria,
  obtenerPostulacionesPorEstado,
  obtenerPostulacionesPorPrograma,
  obtenerUltimosNegocios,
  obtenerUltimasPostulaciones,
  obtenerEstadisticasCliente,
  obtenerCursosMasInscritos,
  obtenerPostulacionesPorMes,
  obtenerNegociosPorEstado,
  obtenerInscripcionesPorCurso,
  obtenerUsuariosPorRol,
};