const activityLogger = require('../../src/libs/activityLogger');

exports.seed = function addUser(knex) {
  return knex('user').insert([
    {
      firstName: 'Admin',
      lastName: 'user',
      email: 'admin@ahmmart.com',
      phoneNumber: '0313-4591721',
      password: 'Admin@123',
      isActive: true,
      status: 'Active',
      accessTemplateID: knex.raw('(select "accessTemplateID" from "accessTemplate" where "name"=\'Admin\')')
    },
    {
      firstName: 'Customer',
      lastName: 'user',
      email: 'customer@ahmmart.com',
      phoneNumber: '0323-8818508',
      password: 'Customer@123',
      isActive: true,
      status: 'Active',
      accessTemplateID: knex.raw('(select "accessTemplateID" from "accessTemplate" where "name"=\'Customer\')')
    },
    {
      firstName: 'Seller',
      lastName: 'user',
      email: 'seller@ahmmart.com',
      phoneNumber: '0323-22222222',
      password: 'Seller@123',
      isActive: true,
      status: 'Active',
      accessTemplateID: knex.raw('(select "accessTemplateID" from "accessTemplate" where "name"=\'Seller\')')
    },
    {
      firstName: 'Seller2',
      lastName: 'user',
      email: 'seller2@ahmmart.com',
      phoneNumber: '0323-33333333',
      password: 'Seller2@123',
      isActive: true,
      status: 'Active',
      accessTemplateID: knex.raw('(select "accessTemplateID" from "accessTemplate" where "name"=\'Seller\')')
    }
  ], '*').then(async (users) => {
    const systemUserId = users[0].userID;
    for (let i = 0; i < users.length; i += 1) {
      const {
        userID, email, firstName, lastName, phoneNumber, isActive, status, address
      } = users[i];

      let role = '';

      switch (email) {
        case 'admin@ahmmart.com':
          role = 'Admin';
          break;
        case 'customer@ahmmart.com':
          role = 'Customer';
          break;
        case 'seller@ahmmart.com':
          role = 'Seller';
          break;
        case 'seller2@ahmmart.com':
          role = 'Seller';
          break;
        default:
          role = 'Admin';
          break;
      }

      await knex('user').update({ createdBy: systemUserId, updatedOn: knex.fn.now() });

      await activityLogger({
        targetEntity: 'Manage Users',
        targetID: userID,
        action: 'Create',
        data: JSON.stringify({
          new: {
            email,
            firstName,
            lastName,
            role,
            phoneNumber,
            isActive,
            status,
            address
          }
        }),
        description: `Created "${role}" user with ${firstName} ${lastName} name`,
        userID: systemUserId
      });
    }
    return users;
  });
};
