function success(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

function failure(res, statusCode, message, extra = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...extra
  });
}

function sendResponse(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data
  });
}

module.exports = {
  failure,
  sendResponse,
  success
};
