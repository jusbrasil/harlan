/**
 * See https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
 *
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param {() => boolean} testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param {() => void} onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param {() => void} onTimeout
 * @param {number} timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
module.exports = function (testFx, onReady, onTimeout, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000;
    var start = new Date().getTime();
    var condition = testFx();
    /** @type {number} */
    // @ts-ignore
    var interval = null;

    var tickFunction = function () {
        if (condition || (condition = testFx())) {
            onReady();
            clearInterval(interval);
            return;
        }

        if ((new Date().getTime() - start >= maxtimeOutMillis)) {
            onTimeout();
            clearInterval(interval);
        }
    };

    var interval = setInterval(/** @type {Function} */(tickFunction), 250);
};
