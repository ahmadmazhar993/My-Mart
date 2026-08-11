const { CLIENT_URL = 'http://10.36.13.15:5173', CONTACT_TO_EMAIL = 'support@ahmmart.store' } = process.env;

module.exports = {
  brandName: 'AHM Mart',
  siteUrl: CLIENT_URL,
  supportEmail: 'support@ahmmart.store',
  sellerEmail: 'support@ahmmart.store',
  phone: '0323-8818508',
  phoneDisplay: '0323-8818508',
  address: 'AHM Mart (Pvt.) Ltd., Near Lahore General Hospital, Ismail Nagar, Lahore, Punjab 54600, Pakistan',
  contactToEmail: CONTACT_TO_EMAIL,
  primaryColor: '#059669',
  helpUrl: `${CLIENT_URL}/help`,
  ordersUrl: `${CLIENT_URL}/orders`,
  productsUrl: `${CLIENT_URL}/products`,
  contactUrl: `${CLIENT_URL}/pages/contact`,
  sellerUrl: `${CLIENT_URL}/pages/become-seller`,
};
