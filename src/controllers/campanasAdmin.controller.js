const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const obtenerCampanas = async (req, res) => {
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

const crearCampana = async (req, res) => {
  try {
    const {
      titulo,
      descripcion,
      metaRecaudacion,
      montoRecaudado,
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
        montoRecaudado: montoRecaudado ? parseFloat(montoRecaudado) : 0,
        fechaInicio: new Date(fechaInicio),
        fechaCierre: new Date(fechaCierre),
        negocioId: parseInt(negocioId),
        creadoPor: req.user.id,
        tipoCrowdfunding,
        estado: estado || 'en_revision',
        activo: true
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

const actualizarCampana = async (req, res) => {
  try {
    const { id } = req.params
    const { activo, ...dataActualizar } = req.body

    const campanaActualizada = await prisma.campana.update({
      where: { id: parseInt(id) },
      data: {
        titulo: dataActualizar.titulo,
        descripcion: dataActualizar.descripcion,
        metaRecaudacion: dataActualizar.metaRecaudacion ? parseFloat(dataActualizar.metaRecaudacion) : undefined,
        montoRecaudado: dataActualizar.montoRecaudado !== undefined ? parseFloat(dataActualizar.montoRecaudado) : undefined,
        fechaInicio: dataActualizar.fechaInicio ? new Date(dataActualizar.fechaInicio) : undefined,
        fechaCierre: dataActualizar.fechaCierre ? new Date(dataActualizar.fechaCierre) : undefined,
        negocioId: dataActualizar.negocioId ? parseInt(dataActualizar.negocioId) : undefined,
        tipoCrowdfunding: dataActualizar.tipoCrowdfunding,
        estado: dataActualizar.estado
      }
    })
    res.json(campanaActualizada)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const toggleActivoCampana = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const item = await prisma.campana.findUnique({ where: { id } })
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'No encontrado' })
    }

    const updated = await prisma.campana.update({
      where: { id },
      data: { activo: !item.activo }
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const obtenerNegociosParaSelect = async (req, res) => {
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

module.exports = {
  obtenerCampanas,
  crearCampana,
  actualizarCampana,
  toggleActivoCampana,
  obtenerNegociosParaSelect
}