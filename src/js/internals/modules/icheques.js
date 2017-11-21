module.exports = function (controller) {

    if (controller.confs.icheques.hosts.indexOf(document.location.hostname) >= 0) {
        controller.registerBootstrap("icheques::init::plataform", function (callback) {
            controller.confs.disableDive = true;
            $.getScript("/js/icheques.js", function () {

                if (navigator.userAgent.match(/iPad/i) !== null) {
                    callback();
                    return;
                }

                controller.registerTrigger("serverCommunication::websocket::authentication::end", "canUseKronoos", (args, callback) => {
                    callback();
                    if (!/federalinvest/i.test(controller.confs.user.commercialReference)) {
                        $.getScript("/js/kronoos.js", () => setTimeout(() => controller.trigger("kronoos::init", args), 1000));
                    }
                });

                callback();
            });
        });
    }

};
