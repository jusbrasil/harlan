import oneTime from 'one-time';

module.exports = controller => {
    const refinCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-refin@1.0.9/index.js'));
    const veiculosCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-veiculos@1.1.3/index.js'));
    if (!controller.confs.icheques.hosts.includes(document.location.hostname)) return;

    controller.registerBootstrap('icheques::init::plataform', callback => $.getScript('/js/icheques.js', () => {

        if (navigator.userAgent.match(/iPad/i) !== null) {
            callback();
            return;
        }

        callback();

        if (!(controller.confs.user.tags && 
                controller.confs.user.tags.indexOf('no-refin') !== -1)) refinCall();
        if (!(controller.confs.user.tags && 
                controller.confs.user.tags.indexOf('no-veiculos') !== -1)) veiculosCall();
    }));
};
