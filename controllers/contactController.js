// controllers/contactController.js
const { sendMail } = require('../services/emailService');

async function sendContactMessage(req, res) {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (name, email, message)' });
  }

  try {
    await sendMail({
      from: email,
      to: 'literia.contacto@gmail.com',
      // Aquí concatenas tanto el nombre como el email en el asunto
      subject: `Nuevo mensaje de contacto de ${name} <${email}>`,
      text: message
    });

    return res.status(200).json({ success: true, msg: 'Mensaje recibido y correo enviado' });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return res.status(500).json({ error: 'Ocurrió un error al enviar el correo' });
  }
}

module.exports = { sendContactMessage };
