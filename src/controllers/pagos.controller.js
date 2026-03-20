const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ 
  accessToken: 'APP_USR-1182692223334422-031921-33788afcc2bbbec8ad66c5c077193b5e-1725094845' 
});

const crearPreferencia = async (req, res) => {
  try {
    const { titulo, precio, cantidad, idReferencia, tipo } = req.body;
    
    const preference = new Preference(client);
    
    const response = await preference.create({
      body: {
        items: [
          {
            id: idReferencia.toString(),
            title: titulo,
            quantity: Number(cantidad),
            unit_price: Number(precio),
            currency_id: 'MXN',
          }
        ],
        back_urls: {
          success: 'http://localhost:5173/pago-exitoso',
          failure: 'http://localhost:5173/pago-fallido',
          pending: 'http://localhost:5173/pago-pendiente'
        },
        auto_return: 'approved',
        metadata: {
          idReferencia,
          tipo,
          usuarioId: req.user ? req.user.id : null
        }
      }
    });

    res.json({ success: true, init_point: response.init_point });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al procesar pago' });
  }
};

const webhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
    }
    
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Error');
  }
};

module.exports = {
  crearPreferencia,
  webhook
};