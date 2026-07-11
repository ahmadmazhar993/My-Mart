const { CLIENT_URL = 'http://10.36.13.15:5173', CONTACT_TO_EMAIL = 'support@ahmmart.com' } = process.env;

module.exports = {
  brandName: 'AHM Mart',
  siteUrl: CLIENT_URL,
  supportEmail: 'support@ahmmart.com',
  sellerEmail: 'sellers@ahmmart.com',
  phone: '0313-4591721',
  phoneDisplay: '0313-4591721',
  address: 'AHM Mart (Pvt.) Ltd., Main Boulevard, Gulberg III, Lahore, Punjab 54000',
  contactToEmail: CONTACT_TO_EMAIL,
  primaryColor: '#059669',
  helpUrl: `${CLIENT_URL}/help`,
  ordersUrl: `${CLIENT_URL}/orders`,
  productsUrl: `${CLIENT_URL}/products`,
  contactUrl: `${CLIENT_URL}/pages/contact`,
  sellerUrl: `${CLIENT_URL}/pages/become-seller`,
};
