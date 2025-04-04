// services/emailService.js
const nodemailer = require('nodemailer');

async function sendMail({ from, to, subject, text }) {
  // Carga variables de entorno
  const user = process.env.GMAIL_USER; 
  const pass = process.env.GMAIL_PASS;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,  // tu_correo@gmail.com
      pass: pass   // contraseña de aplicación de 16 caracteres
    }
  });

  const mailOptions = {
    from,
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
  console.log(`Correo enviado a ${to}`);
}

module.exports = { sendMail };
