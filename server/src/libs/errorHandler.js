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

function genericErrorHandler(err, req, res, next) {
  logger.error(`[ERROR]][Function::genericErrorHandler][Path::${req.path}][Method::${req.method}][HasNext::${!!(next !== null)}]::Error`, err);
  res.status(err.status || HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR)
    .json({
      error: true,
      statusCodes: HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR,
      message: HttpStatus.ReasonPhrases.INTERNAL_SERVER_ERROR
    });
}

module.exports = { notFound, genericErrorHandler };
