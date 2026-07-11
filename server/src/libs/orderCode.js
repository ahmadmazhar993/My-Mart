const crypto = require('crypto');

const generateOrderReferenceCode = () => {
  const randomNumber = crypto.randomInt(100000, 999999);
  return `AHM-${String(randomNumber).padStart(6, '0')}`;
};

const createUniqueOrderReferenceCode = async (trx) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateOrderReferenceCode();
    const existingOrder = await trx('orders').where({ orderCode: code }).first();

    if (!existingOrder) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique order reference code');
};

module.exports = {
  generateOrderReferenceCode,
  createUniqueOrderReferenceCode,
};
