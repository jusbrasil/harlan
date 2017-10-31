module.exports = function (controller) {

    if (controller.confs.icheques.hosts.indexOf(document.location.hostname) >= 0) {
        controller.registerBootstrap("icheques::init::plataform", function (callback) {
            controller.confs.disableDive = true;
            $.getScript("/js/icheques.js", function () {

                if (navigator.userAgent.match(/iPad/i) !== null) {
                    callback();
                    return;
                }

                $.getScript("/js/kronoos.js", function () {
                    callback();
                });
                
            });
        });
    }

};
