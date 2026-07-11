exports.seed = function addAccessTemplates(knex) {
    return knex('accessTemplate').insert([
        { name: 'Admin', type: 'Admin', description: 'is a Admin, who has full access to the portal and can impersonate any user, field, or customer user' },
        { name: 'Customer', type: 'Customer', description: 'is a Customer, who can access only their own data and just view it' },
        { name: 'Seller', type: 'Seller', description: 'is a Seller, who can access only their own data and just view it' },
    ]).onConflict('name').merge();
};
