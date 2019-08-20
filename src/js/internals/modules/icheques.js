import oneTime from 'one-time';

module.exports = controller => {
    if (!controller.confs.icheques.hosts.includes(document.location.hostname)) return;
    const failAlert = () => harlan.alert({
        subtitle: 'Não foi possível carregar um módulo da iCheques.',
        paragraph: 'Verifique se o endereço cdn.jsdelivr.net é liberado na sua rede interna.',
    });

    const refinCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-refin@1.0.9/index.js').fail(failAlert));
    const veiculosCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-icheques-veiculos@1.1.3/index.js').fail(failAlert));
    const followCall = oneTime(() => $.getScript('https://cdn.jsdelivr.net/npm/harlan-follow-document@1.1.8/index.js').fail(failAlert));

    controller.registerBootstrap('icheques::init::plataform', callback => $.getScript('/js/icheques.js').done(() => {
        callback();
        const tags = (controller.confs.user || {}).tags || [];
        if (tags.indexOf('no-follow') === -1) followCall();
        if (tags.indexOf('no-refin') === -1) refinCall();
        if (tags.indexOf('no-veiculos') === -1) veiculosCall();
    }).fail(() => {
        callback();
        failAlert();        
    }));
};
