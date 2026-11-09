const HttpStatus = require('http-status-codes');
const logger = require('../config/winston');

function notFound(req, res, next) {
  logger.error(`[ERROR]][Function::notFound][Path::${req.path}][Method::${req.method}][HasNext::${!!(next !== null)}]::Error::NotFound`);

  res.status(HttpStatus.StatusCodes.NOT_FOUND)
    .json({
      error: true,
      statusCodes: HttpStatus.StatusCodes.NOT_FOUND,
      message: HttpStatus.ReasonPhrases.NOT_FOUND
    });
}

// Many handlers return err.message to the client. When that message is a raw database
// error (SQL text, constraint names, column names) log it and send a generic one instead.
const DB_ERROR_PATTERN = new RegExp([
  String.raw`\b(insert into|delete from|select .+ from)\b`,
  String.raw`\bupdate "?\w+"? set\b`,
  'violates (not-null|unique|foreign key|check) constraint',
  'duplicate key value',
  'invalid input syntax',
  'relation ".+" does not exist',
  'column ".+" (of relation|does not exist)',
  'syntax error at or near',
  'null value in column',
].join('|'), 'i');

function hideDatabaseErrors(req, res, next) {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body.message === 'string' && DB_ERROR_PATTERN.test(body.message)) {
      logger.error(`[ERROR][Function::hideDatabaseErrors][Path::${req.path}][Method::${req.method}]::${body.message}`);
      return sendJson({
        ...body,
        message: 'We could not save your request. Please check the details and try again.',
      });
    }
    return sendJson(body);
  };
  next();
}

function genericErrorHandler(err, req, res, next) {
  logger.error(`[ERROR]][Function::genericErrorHandler][Path::${req.path}][Method::${req.method}][HasNext::${!!(next !== null)}]::Error`, err);
  res.status(err.status || HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR)
    .json({
      error: true,
      statusCodes: HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR,
      message: HttpStatus.ReasonPhrases.INTERNAL_SERVER_ERROR
    });
}

module.exports = { notFound, genericErrorHandler, hideDatabaseErrors };
