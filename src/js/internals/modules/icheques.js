import oneTime from 'one-time';

module.exports = controller => {
    if (!controller.confs.icheques.hosts.includes(document.location.hostname)) return;

    const refinCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-refin@1.0.9/index.js'));
    const veiculosCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-veiculos@1.1.3/index.js'));
    const followCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-follow-document@1.1.8/index.js'));

    controller.registerBootstrap('icheques::init::plataform', callback => $.getScript('/js/icheques.js', () => {
        callback();
        if (navigator.userAgent.match(/iPad/i) !== null) {
            return;
        }
        followCall();
        if (!(controller.confs.user.tags && controller.confs.user.tags.indexOf('no-refin') !== -1)) refinCall();
        if (!(controller.confs.user.tags && controller.confs.user.tags.indexOf('no-veiculos') !== -1)) veiculosCall();
    }));
};
