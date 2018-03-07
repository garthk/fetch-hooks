/**
 * Determine if `request.body` matters.
 *
 * @param {Request} request
 * @returns {boolean}
 */
module.exports = function bodyMatters(request) {
    return (['GET', 'HEAD'].indexOf(request.method.toUpperCase()) < 0);
}
