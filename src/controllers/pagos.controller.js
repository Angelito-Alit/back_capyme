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

    const preference  = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const backendUrl  = process.env.BACKEND_URL  || 'https://back-capyme.onrender.com';

    const response = await preference.create({
      body: {
        items: [
          {
            id:          String(idReferencia),
            title:       titulo,
            quantity:    Number(cantidad),
            unit_price:  Number(precio),
            currency_id: 'MXN',
          },
        ],
        // MP devuelve este valor en back_url como ?external_reference=...
        // Lo usamos para confirmar el pago sin esperar el webhook
        external_reference: String(idReferencia),

        back_urls: {
          success: `${frontendUrl}/pago-exitoso`,
          failure: `${frontendUrl}/pago-fallido`,
          pending: `${frontendUrl}/pago-pendiente`,
        },
        auto_return: 'approved',

        metadata: {
          idReferencia,
          tipo,
          usuarioId: req.user ? req.user.id : null,
        },

        notification_url: `${backendUrl}/api/pagos/webhook`,
      },
    });

    res.json({ success: true, init_point: response.init_point, preference_id: response.id });
  } catch (error) {
    console.error('Error MP crearPreferencia:', error);
    res.status(500).json({ success: false, message: 'Error al procesar pago', error: error.message });
  }
};

const webhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id) {
      const paymentId     = data.id;
      const paymentClient = new Payment(client);
      const paymentInfo   = await paymentClient.get({ id: paymentId });

      const status      = paymentInfo.status;
      const externalRef = paymentInfo.external_reference;
      const metadata    = paymentInfo.metadata || {};
      const tipo        = metadata.tipo || '';

      if (status === 'approved' && externalRef) {

        // Cursos (referencias empiezan con REF)
        if (tipo === 'curso' || String(externalRef).startsWith('REF')) {
          const pago = await prisma.pagoInscripcion.findUnique({
            where: { referencia: String(externalRef) },
            include: {
              inscripcion: {
                include: {
                  usuario: { select: { id: true } },
                  curso:   { select: { titulo: true } },
                },
              },
            },
          });

          if (pago && pago.estadoPago !== 'confirmado') {
            await prisma.pagoInscripcion.update({
              where: { id: pago.id },
              data: {
                estadoPago:        'confirmado',
                mercadoPagoId:     String(paymentId),
                fechaConfirmacion: new Date(),
              },
            });

            await prisma.notificacion.create({
              data: {
                usuarioId: pago.inscripcion.usuario.id,
                tipo:    'pago_confirmado',
                titulo:  'Pago confirmado',
                mensaje: `Tu pago para el curso "${pago.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`,
                leida:   false,
              },
            });
          }
        }

        // Recursos (referencias empiezan con REC)
        if (tipo === 'recurso' || String(externalRef).startsWith('REC')) {
          const pago = await prisma.pagoAccesoRecurso.findUnique({
            where: { referencia: String(externalRef) },
            include: {
              acceso: {
                include: {
                  usuario: { select: { id: true } },
                  enlace:  { select: { titulo: true } },
                },
              },
            },
          });

          if (pago && pago.estadoPago !== 'confirmado') {
            await prisma.$transaction([
              prisma.pagoAccesoRecurso.update({
                where: { id: pago.id },
                data: {
                  estadoPago:        'confirmado',
                  mercadoPagoId:     String(paymentId),
                  fechaConfirmacion: new Date(),
                },
              }),
              prisma.accesoRecurso.update({
                where: { id: pago.accesoId },
                data:  { estado: 'activo' },
              }),
            ]);

            await prisma.notificacion.create({
              data: {
                usuarioId: pago.acceso.usuario.id,
                tipo:    'acceso_confirmado',
                titulo:  'Acceso confirmado',
                mensaje: `Tu acceso al recurso "${pago.acceso.enlace.titulo}" fue confirmado.`,
                leida:   false,
              },
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook MP error:', error);
    res.status(200).send('OK');
  }
};

module.exports = { crearPreferencia, webhook };