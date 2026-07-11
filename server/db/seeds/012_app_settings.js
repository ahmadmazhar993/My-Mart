exports.seed = function addAppSettings(knex) {
    return knex('appSettings').insert([
        {
            name: 'SMTP',
            type: 'JSON',
            value: JSON.stringify({
                host: 'localhost',
                port: 1025,
                ssl: false,
                user: '',
                pass: '',
                subjectPrefix: '[AHM MART] '
            }),
            createdBy: knex.raw('(select "userID" from "user" where "email"=\'admin@ahmmart.com\')'),
            updatedBy: knex.raw('(select "userID" from "user" where "email"=\'admin@ahmmart.com\')')
        }
    ]);
};
