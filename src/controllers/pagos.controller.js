const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { prisma } = require('../config/database');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-1182692223334422-031921-33788afcc2bbbec8ad66c5c077193b5e-1725094845',
});

const crearPreferencia = async (req, res) => {
  try {
    const { titulo, precio, cantidad = 1, idReferencia, tipo } = req.body;

    if (!titulo || !precio || !idReferencia || !tipo) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    const preference = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL;
    const backendUrl  = process.env.BACKEND_URL ;

    const response = await preference.create({
      body: {
        items: [
          {
            id:         String(idReferencia),
            title:      titulo,
            quantity:   Number(cantidad),
            unit_price: Number(precio),
            currency_id: 'MXN',
          },
        ],
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
        const refStr = String(externalRef);

        const esCurso    = tipo === 'curso'    || refStr.startsWith('REF');
        const esRecurso  = tipo === 'recurso'  || refStr.startsWith('RESR') || refStr.startsWith('REC');
        const esInversion= tipo === 'campana'  || refStr.startsWith('INV');

        if (esCurso) {
          const pago = await prisma.pagoInscripcion.findUnique({
            where: { referencia: refStr },
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
                tipo:      'pago_confirmado',
                titulo:    'Pago confirmado',
                mensaje:   `Tu pago para el curso "${pago.inscripcion.curso.titulo}" fue confirmado. ¡Bienvenido!`,
                leida:     false,
              },
            });
          }
        }

        if (esRecurso) {
          const pago = await prisma.pagoAccesoRecurso.findUnique({
            where: { referencia: refStr },
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
                data: { estado: 'activo' },
              }),
            ]);

            await prisma.notificacion.create({
              data: {
                usuarioId: pago.acceso.usuario.id,
                tipo:      'acceso_confirmado',
                titulo:    'Acceso confirmado',
                mensaje:   `Tu acceso al recurso "${pago.acceso.enlace.titulo}" fue confirmado.`,
                leida:     false,
              },
            });
          }
        }

        if (esInversion) {
          const inversion = await prisma.inversion.findUnique({
            where: { referencia: refStr },
            include: {
              campana:  { select: { id: true, titulo: true, metaRecaudacion: true, montoRecaudado: true, tipoCrowdfunding: true } },
              inversor: { select: { id: true } },
            },
          });

          if (inversion && inversion.estadoPago !== 'confirmado') {
            await prisma.$transaction(async (tx) => {
              await tx.inversion.update({
                where: { id: inversion.id },
                data: {
                  estadoPago:        'confirmado',
                  mercadoPagoId:     String(paymentId),
                  fechaConfirmacion: new Date(),
                },
              });

              await tx.campana.update({
                where: { id: inversion.campanaId },
                data:  { montoRecaudado: { increment: parseFloat(inversion.monto) } },
              });

              const metaNum    = parseFloat(inversion.campana.metaRecaudacion);
              const nuevoTotal = parseFloat(inversion.campana.montoRecaudado || 0) + parseFloat(inversion.monto);
              if (nuevoTotal >= metaNum) {
                await tx.campana.update({ where: { id: inversion.campanaId }, data: { estado: 'completada' } });
              }
            });

            const esInversionReal = inversion.campana.tipoCrowdfunding === 'inversion';
            let mensajeNotif = esInversionReal 
              ? `Tu inversión de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmada. Comuníquese con el gerente de CAPYME y el dueño de la campaña. Es su responsabilidad avisar a ambos.`
              : `Tu donativo de $${parseFloat(inversion.monto).toLocaleString('es-MX')} MXN en "${inversion.campana.titulo}" fue confirmado.`;

            await prisma.notificacion.create({
              data: {
                usuarioId: inversion.inversor.id,
                tipo:      'inversion_confirmada',
                titulo:    'Aportación confirmada',
                mensaje:   mensajeNotif,
                leida:     false,
              },
            });
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    res.status(200).send('OK');
  }
};

module.exports = { crearPreferencia, webhook };