module.exports = function(controller) {

    if (controller.confs.kronoos.hosts.indexOf(document.location.hostname) >= 0) {
        controller.confs.kronoos.isKronoos = true;
        controller.registerBootstrap("kronoos::init::plataform", function(callback) {
            $.getScript("/js/kronoos.js", function() {
                if (controller.confs.disableDive) {
                    callback();
                    return;
                }
                $.getScript("/js/dive.js", function() {
                    callback();
                });
            });
        });
    }

};
