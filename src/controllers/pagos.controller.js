const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { prisma } = require('../config/database');

const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-1182692223334422-031921-33788afcc2bbbec8ad66c5c077193b5e-1725094845',
});

const crearPreferencia = async (req, res) => {
  try {
    const { titulo, precio, cantidad = 1, idReferencia, tipo } = req.body;

    if (!titulo || !precio || !idReferencia || !tipo) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    const preference = new Preference(client);

    const backBase = process.env.FRONTEND_URL || 'http://localhost:3001';

    const response = await preference.create({
      body: {
        items: [
          {
            id: String(idReferencia),
            title: titulo,
            quantity: Number(cantidad),
            unit_price: Number(precio),
            currency_id: 'MXN',
          },
        ],
        back_urls: {
          success: `${backBase}/pago-exitoso`,
          failure: `${backBase}/pago-fallido`,
          pending: `${backBase}/pago-pendiente`,
        },
        auto_return: 'approved',
        metadata: {
          idReferencia,
          tipo,
          usuarioId: req.user ? req.user.id : null,
        },
        notification_url: `${process.env.BACKEND_URL || 'https://tu-backend.onrender.com'}/api/pagos/webhook`,
      },
    });

    res.json({ success: true, init_point: response.init_point, preference_id: response.id });
  } catch (error) {
    console.error('Error Mercado Pago:', error);
    res.status(500).json({ success: false, message: 'Error al procesar pago', error: error.message });
  }
};

// ─── Webhook de Mercado Pago ───────────────────────────────────────────────
const webhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id) {
      const paymentId = data.id;

      // Obtener detalles del pago desde MP
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: paymentId });

      const status = paymentInfo.status; // approved | pending | rejected
      const metadata = paymentInfo.metadata || {};
      const tipo = metadata.tipo; // 'curso' | 'recurso'
      const idReferencia = metadata.id_referencia || metadata.idReferencia;

      if (status === 'approved' && tipo === 'curso' && idReferencia) {
        // Buscar el pago por referencia
        const pago = await prisma.pagoInscripcion.findUnique({
          where: { referencia: String(idReferencia) },
          include: {
            inscripcion: {
              include: {
                usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
                curso: { select: { id: true, titulo: true } },
              },
            },
          },
        });

        if (pago && pago.estadoPago !== 'confirmado') {
          // Confirmar automáticamente
          await prisma.pagoInscripcion.update({
            where: { id: pago.id },
            data: {
              estadoPago: 'confirmado',
              mercadoPagoId: String(paymentId),
              fechaConfirmacion: new Date(),
            },
          });

          // Notificar al usuario
          await prisma.notificacion.create({
            data: {
              usuarioId: pago.inscripcion.usuario.id,
              tipo: 'pago_confirmado',
              titulo: 'Pago confirmado',
              mensaje: `Tu pago para el curso "${pago.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`,
              leida: false,
            },
          });
        }
      }

      if (status === 'approved' && tipo === 'recurso' && idReferencia) {
        const pago = await prisma.pagoAccesoRecurso.findUnique({
          where: { referencia: String(idReferencia) },
          include: {
            acceso: {
              include: {
                usuario: { select: { id: true, nombre: true, apellido: true } },
                enlace: { select: { id: true, titulo: true } },
              },
            },
          },
        });

        if (pago && pago.estadoPago !== 'confirmado') {
          await prisma.$transaction([
            prisma.pagoAccesoRecurso.update({
              where: { id: pago.id },
              data: {
                estadoPago: 'confirmado',
                mercadoPagoId: String(paymentId),
                fechaConfirmacion: new Date(),
              },
            }),
            prisma.accesoRecurso.update({
              where: { id: pago.accesoId },
              data: { estado: 'activo' },
            }),
          ]);

          await prisma.notificacion.create({
            data: {
              usuarioId: pago.acceso.usuario.id,
              tipo: 'acceso_confirmado',
              titulo: 'Acceso confirmado',
              mensaje: `Tu pago para el recurso "${pago.acceso.enlace.titulo}" fue confirmado. ¡Ya tienes acceso!`,
              leida: false,
            },
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Siempre 200 para que MP no reintente indefinidamente
  }
};

module.exports = { crearPreferencia, webhook };