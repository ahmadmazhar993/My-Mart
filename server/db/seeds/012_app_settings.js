exports.seed = async function addAppSettings(knex) {
    const admin = await knex('user').select('userID').where('email', 'admin@ahmmart.com').first();

    if (!admin) {
        return;
    }

    const existingSetting = await knex('appSettings').select('appSettingID').where('name', 'SMTP').first();

    if (!existingSetting) {
        await knex('appSettings').insert({
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
            createdBy: admin.userID,
            updatedBy: admin.userID
        });
    }
};
