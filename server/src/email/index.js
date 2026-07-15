const MailGen = require('mailgen');
const Nodemailer = require('nodemailer');
const path = require('path');

const db = require('../db');
const logger = require('../config/winston');
const { decryptPassword } = require('../libs/passEncryption');

const { NODE_ENV = 'development', HOST_PATH = 'http://10.36.13.15:5173' } = process.env;

let mailConCount = 0;
const maxConLimit = 2;

const addDelay = async () => new Promise((resolve) => setTimeout(() => resolve(true), 100));

async function warpedSendMail(mailOptions, smtpObj) {
  return new Promise((resolve) => {
    const transporter = Nodemailer.createTransport(smtpObj);
    try {
      const mailGenerator = new MailGen({
        theme: {
          path: path.resolve(__dirname, 'theme/index.html'),
          plaintextPath: path.resolve(__dirname, 'theme/index.txt')
        },
        product: {
          name: 'AHM Mart',
          link: HOST_PATH,
          copyright: `© ${new Date().getFullYear()} AHM Mart. All rights reserved.`,
        }
      });

      const emailBody = mailGenerator.generate({
        body: mailOptions.body
      });

      const emailText = mailGenerator.generatePlaintext({
        body: mailOptions.body
      });

      logger.log('info', `[EMAIL][Function::warpedSendMail][Environment::${NODE_ENV}]::Email object`, mailOptions);

      transporter.sendMail({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: `${mailOptions.subjectPrefix && !mailOptions.subject.startsWith('[') ? `${mailOptions.subjectPrefix} ` : ''}${mailOptions.subject}`,
        html: emailBody,
        text: emailText,
        attachments: mailOptions.attachments
      }, (error, info) => {
        if (error) {
          console.error('Message sent failed::', error);
          logger.error(`[EMAIL][Function::warpedSendMail][Environment::${NODE_ENV}]::Error`, error);
          resolve({ success: false, message: error });
        } else {
          logger.log('info', `[EMAIL][Function::warpedSendMail][Environment::${NODE_ENV}]::Message sent successfully`, info);
          // console.log('Message sent successfully::', info.response);
          resolve({ success: true, message: info.response });
        }
      });
    } catch (error) {
      logger.error(`[EMAIL][Function::wrappedSendMail][Environment::${NODE_ENV}]::Error`, error);
      resolve({ success: false, message: error });
    }
  });
}

const getSmtpObj = async () => {
  let smtp = null;

  // if (NODE_ENV.toLowerCase() !== 'production') {
  //     return {
  //         smtpObj: { port: 1025, ignoreTLS: true },
  //         subjectPrefix: '[AHM MART] '
  //     };
  // }

  const getSettings = await db('appSettings').first('value').where('name', 'SMTP');
  if (getSettings) {
    smtp = JSON.parse(getSettings.value);
  }

  if (!getSettings || (smtp && smtp.host === 'localhost')) {
    return {
      smtpObj: { port: 1025, ignoreTLS: true },
      subjectPrefix: smtp.subjectPrefix || '[AHM MART] '
    };
  }

  const smtpObj = {};

  switch (smtp.host) {
    case 'smtp.office365.com':
      smtpObj.service = 'Outlook365';
      break;
    case 'smtp.gmail.com':
      smtpObj.service = 'Gmail';
      break;
    case 'smtp-mail.outlook.com':
      smtpObj.service = 'Hotmail';
      break;
    case 'smtp.mail.yahoo.com':
      smtpObj.service = 'Yahoo';
      break;
    default:
      smtpObj.host = smtp.host;
      smtpObj.secure = false;
      smtpObj.ignoreTLS = true;
      smtpObj.tls = { rejectUnauthorized: false, ciphers: 'SSLv3' };
      if (smtp.port) {
        smtpObj.port = smtp.port;
      }
      break;
  }

  if (smtp.user && smtp.pass) {
    smtpObj.auth = {
      user: smtp.user,
      pass: smtp.pass
      // pass: decryptPassword(smtp.pass)
    };
  }
  return { smtpObj, subjectPrefix: smtp.subjectPrefix || '[AHM MART] ' };
};

const sendEmail = async ({
  body = {}, from = 'noreply@ahmmart.com', to = null,
  subject = 'AHM Mart', attachments = []
}) => {
  if (!to || to === '') {
    logger.log('info', '[EMAIL][Function::sendEmail]::Error::The "To" email address is not given');
    return ({ success: false, message: 'The "To" email address is not given' });
  }
  const { smtpObj, subjectPrefix } = await getSmtpObj();

  if (mailConCount >= maxConLimit) {
    do { await addDelay(); }
    while (mailConCount >= maxConLimit);
  }

  mailConCount += 1;

  const response = await warpedSendMail({
    body,
    from: { name: 'AHM Mart', address: (smtpObj.auth && smtpObj.auth.user) || from },
    to,
    subject,
    subjectPrefix,
    attachments
  }, smtpObj).catch((error) => ({ success: false, message: error }));

  mailConCount -= 1;
  return response;
};

const verifySmtpSettings = async (smtp) => {
  if (!smtp) {
    return false;
  }

  const smtpObj = {};

  switch (smtp.host) {
    case 'smtp.office365.com':
      smtpObj.service = 'Outlook365';
      break;
    case 'smtp.gmail.com':
      smtpObj.service = 'Gmail';
      break;
    case 'smtp-mail.outlook.com':
      smtpObj.service = 'Hotmail';
      break;
    case 'smtp.mail.yahoo.com':
      smtpObj.service = 'Yahoo';
      break;
    default:
      smtpObj.host = smtp.host;
      smtpObj.secure = false;
      smtpObj.ignoreTLS = true;
      smtpObj.tls = { rejectUnauthorized: false, ciphers: 'SSLv3' };
      if (smtp.port) {
        smtpObj.port = smtp.port;
      }
      break;
  }

  if (smtp.user && smtp.pass) {
    smtpObj.auth = {
      user: smtp.user,
      pass: smtp.pass
    };
  }

  logger.log('info', '[EMAIL][Function::verifySmtpSettings]::SMTP object', smtpObj);

  return new Promise((resolve) => {
    const transporter = Nodemailer.createTransport(smtpObj);

    transporter.verify((error, success) => {
      if (error) {
        logger.error('[EMAIL][Function::verifySmtpSettings]::Error', error);
        // console.log(error);
        return resolve({ error: true, message: typeof error === 'object' ? JSON.stringify(error) : error });
      }
      logger.log('info', '[EMAIL][Function::verifySmtpSettings]::Server is ready to take our messages', success);
      // console.log('Server is ready to take our messages', success);
      return resolve({ success: true, message: 'Server is ready to take our messages' });
    });
  });
};

module.exports = { sendEmail, verifySmtpSettings };
