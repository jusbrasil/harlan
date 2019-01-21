import oneTime from 'one-time';

module.exports = controller => {
    const kronoosCall = oneTime(args => $.getScript('/js/kronoos.js', () => controller.trigger('kronoos::init', args)));
    const refinCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-refin@1.0.7/index.js'));
    const veiculosCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-veiculos@1.1.3/index.js'));
    if (!controller.confs.icheques.hosts.includes(document.location.hostname)) return;

    controller.registerBootstrap('icheques::init::plataform', callback => $.getScript('/js/icheques.js', () => {

        if (navigator.userAgent.match(/iPad/i) !== null) {
            callback();
            return;
        }

        callback();

        controller.registerTrigger('serverCommunication::websocket::authentication::end', 'kronoosPlugin', (args, callbackAuthentication) => {
            callbackAuthentication();
            if (!(controller.confs.user.tags && 
                controller.confs.user.tags.indexOf('no-refin') !== -1)) refinCall();
            if (!(controller.confs.user.tags && 
                controller.confs.user.tags.indexOf('no-veiculos') !== -1)) veiculosCall();
            if (/federal\s*invest/i.test(controller.confs.user.commercialReference)) return;
            kronoosCall(args);
        });
    }));
};
