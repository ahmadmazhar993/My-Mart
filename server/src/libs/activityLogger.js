const db = require('../db');
const logger = require('../config/winston');

async function activityLogger({
  targetEntity, targetID, description, userID, action, data = null
}) {
  const writeActivityLog = await db('userActivityLog').insert({
    targetEntity, targetID, description, userID, action, data
  }, 'userActivityLogID');

  logger.log('info', '[ACTIVITY-LOGGER][Function::activityLogger]::Write log', writeActivityLog);
}

module.exports = activityLogger;
