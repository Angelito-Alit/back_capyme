import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const obtenerCampanas = async (req, res) => {
  try {
    const campanas = await prisma.campana.findMany({
      include: {
        negocio: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true
              }
            }
          }
        },
        creador: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    })
    res.json(campanas)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const crearCampana = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      metaRecaudacion,
      fechaInicio,
      fechaCierre,
      negocioId,
      tipoCrowdfunding,
      estado
    } = req.body

    const nuevaCampana = await prisma.campana.create({
      data: {
        titulo,
        descripcion,
        metaRecaudacion: parseFloat(metaRecaudacion),
        fechaInicio: new Date(fechaInicio),
        fechaCierre: new Date(fechaCierre),
        negocioId: parseInt(negocioId),
        creadoPor: req.usuario.id,
        tipoCrowdfunding,
        estado: estado || 'en_revision'
      },
      include: {
        negocio: true
      }
    })
    res.status(201).json(nuevaCampana)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const actualizarCampana = async (req, res) => {
  try {
    const { id } = req.params
    const {
      titulo,
      descripcion,
      metaRecaudacion,
      fechaInicio,
      fechaCierre,
      negocioId,
      tipoCrowdfunding,
      estado,
      activo
    } = req.body

    const campanaActualizada = await prisma.campana.update({
      where: { id: parseInt(id) },
      data: {
        titulo,
        descripcion,
        metaRecaudacion: metaRecaudacion ? parseFloat(metaRecaudacion) : undefined,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
        fechaCierre: fechaCierre ? new Date(fechaCierre) : undefined,
        negocioId: negocioId ? parseInt(negocioId) : undefined,
        tipoCrowdfunding,
        estado,
        activo
      }
    })
    res.json(campanaActualizada)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const eliminarCampana = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.campana.delete({
      where: { id: parseInt(id) }
    })
    res.json({ message: "Campaña eliminada correctamente" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const obtenerNegociosParaSelect = async (req, res) => {
  try {
    const negocios = await prisma.negocio.findMany({
      where: { activo: true },
      include: {
        usuario: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      }
    })
    res.json(negocios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}