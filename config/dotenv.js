// config/dotenv.js
require('dotenv').config();

// Aquí podrías validar la presencia de algunas variables importantes:
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Falta la variable OPENAI_API_KEY en el archivo .env');
}