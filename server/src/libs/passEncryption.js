require('dotenv').config();

const crypto = require('crypto');

const { PASS_KEY = crypto.randomBytes(32), INI_VECTOR = crypto.randomBytes(16) } = process.env;

function encryptPassword(password) {
  const cipher = crypto.createCipheriv('aes-256-cbc', PASS_KEY, INI_VECTOR);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptPassword(encryptedPassword) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', PASS_KEY, INI_VECTOR);
  let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encryptPassword, decryptPassword };
