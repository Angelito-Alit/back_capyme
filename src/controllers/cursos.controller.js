// src/controllers/cursos.controller.js
const { prisma } = require('../config/database');

const obtenerCursos = async (req, res) => {
  try {
    const { activo, modalidad } = req.query;
    
    const where = {};
    if (activo !== undefined) where.activo = activo === 'true';
    if (modalidad) where.modalidad = modalidad;

    const cursos = await prisma.curso.findMany({
      where,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        inscripciones: {
          select: {
            id: true
          }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    const cursosConInscritos = cursos.map(curso => ({
      ...curso,
      inscritosCount: curso.inscripciones.length,
      inscripciones: undefined
    }));

    res.json({
      success: true,
      data: cursosConInscritos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener cursos',
      error: error.message
    });
  }
};

const obtenerCursoPorId = async (req, res) => {
  try {
    const curso = await prisma.curso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        inscripciones: {
          select: {
            id: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true
              }
            },
            estado: true
          }
        }
      }
    });

    if (!curso) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    res.json({
      success: true,
      data: curso
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener curso',
      error: error.message
    });
  }
};

const crearCurso = async (req, res) => {
  try {
    const curso = await prisma.curso.create({
      data: {
        ...req.body,
        creadoPor: req.user.id
      },
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      data: curso
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear curso',
      error: error.message
    });
  }
};

const actualizarCurso = async (req, res) => {
  try {
    const curso = await prisma.curso.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Curso actualizado exitosamente',
      data: curso
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar curso',
      error: error.message
    });
  }
};

const eliminarCurso = async (req, res) => {
  try {
    await prisma.curso.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({
      success: true,
      message: 'Curso eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar curso',
      error: error.message
    });
  }
};

const inscribirCurso = async (req, res) => {
  try {
    const cursoId = parseInt(req.params.id);
    const { negocioId } = req.body;

    const curso = await prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        inscripciones: true
      }
    });

    if (!curso) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    if (!curso.activo) {
      return res.status(400).json({
        success: false,
        message: 'Este curso no está disponible'
      });
    }

    if (curso.cupoMaximo && curso.inscripciones.length >= curso.cupoMaximo) {
      return res.status(400).json({
        success: false,
        message: 'El curso ha alcanzado el cupo máximo'
      });
    }

    const inscripcionExistente = await prisma.inscripcionCurso.findUnique({
      where: {
        usuarioId_cursoId: {
          usuarioId: req.user.id,
          cursoId
        }
      }
    });

    if (inscripcionExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya estás inscrito en este curso'
      });
    }

    const inscripcion = await prisma.inscripcionCurso.create({
      data: {
        cursoId,
        usuarioId: req.user.id,
        negocioId: negocioId || null
      },
      include: {
        curso: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Inscripción realizada exitosamente',
      data: inscripcion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al inscribir en curso',
      error: error.message
    });
  }
};

const obtenerInscritos = async (req, res) => {
  try {
    const inscritos = await prisma.inscripcionCurso.findMany({
      where: { cursoId: parseInt(req.params.id) },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        negocio: {
          select: {
            id: true,
            nombreNegocio: true
          }
        }
      },
      orderBy: { fechaInscripcion: 'desc' }
    });

    res.json({
      success: true,
      data: inscritos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener inscritos',
      error: error.message
    });
  }
};

module.exports = {
  obtenerCursos,
  obtenerCursoPorId,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
  inscribirCurso,
  obtenerInscritos
};