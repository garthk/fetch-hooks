const fetch =  require('../fetch');

/**
 * Dump `curl` command lines to standard error.
 *
 * @param {Request} request
 */
module.exports = async function curlHook(request) {
    let command = 'curl';
    const blocks = [];
    blocks.push(`'${request.url}'`);
    blocks.push('-D -'); // dump server response headers
    blocks.push(`-X ${request.method}`);
    request.headers.forEach((v, k) => {
        blocks.push(`-H '${k}: ${v}'`);
    });
    if (['GET', 'HEAD'].indexOf(request.method.toUpperCase()) < 0) {
        command = 'cat /tmp/input | curl';
        blocks.push('--data-binary @-');
    }
    console.error(command + ' \\\n    ' + blocks.join(' \\\n    '));
    return null;
};
