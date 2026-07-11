const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');

async function listSellers(req, res) {
  const sellers = await db('sellers').select('*');
  return res.status(StatusCodes.OK).json({ success: true, data: sellers });
}

async function getSellerById(req, res) {
  const { id } = req.params;
  const seller = await db('sellers').where({ id }).first();
  if (!seller) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Seller not found' });
  return res.status(StatusCodes.OK).json({ success: true, data: seller });
}

async function createSeller(req, res) {
  const [id] = await db('sellers').insert(req.body).returning('id');
  return res.status(StatusCodes.CREATED).json({ success: true, data: { id } });
}

async function updateSeller(req, res) {
  const { id } = req.params;
  await db('sellers').where({ id }).update(req.body);
  return res.status(StatusCodes.OK).json({ success: true, message: 'Seller updated' });
}

async function deleteSeller(req, res) {
  const { id } = req.params;
  await db('sellers').where({ id }).del();
  return res.status(StatusCodes.OK).json({ success: true, message: 'Seller deleted' });
}

module.exports = { listSellers, getSellerById, createSeller, updateSeller, deleteSeller };
