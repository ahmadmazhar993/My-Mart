const db = require('../db');
const logger = require('../config/winston');
const { sendSellerNotificationEmail } = require('../email/templates');

const PREFERENCE = {
  newOrder: 'notifyNewOrder',
  returns: 'notifyReturns',
  payouts: 'notifyPayouts',
};

/**
 * Best-effort email to a seller, honouring their notification preferences.
 * Never throws: a mail problem must not fail the order/return/payout that triggered it.
 */
async function notifySeller(sellerId, topic, mail) {
  try {
    const seller = await db('sellers as s')
      .join('user as u', 'u.userID', 's.user_id')
      .first('s.shopName', 's.status', `s.${PREFERENCE[topic]} as enabled`, 'u.email')
      .where('s.sellerID', sellerId);
    if (!seller || seller.status !== 'approved' || !seller.enabled || !seller.email) return;
    await sendSellerNotificationEmail({ email: seller.email, shopName: seller.shopName, ...mail });
  } catch (err) {
    logger.error('[SELLER][notify]::Failed to send seller notification', err);
  }
}

module.exports = { notifySeller };
