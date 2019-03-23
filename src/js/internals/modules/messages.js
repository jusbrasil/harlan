const MarkdownIt = require('markdown-it')({
    break: true,
    xhtmlOut: true,
});

module.exports = controller => {

    let alert = null;

    controller.registerCall('inbox::check', () => {
        controller.serverCommunication.call('SELECT FROM \'HARLANMESSAGES\'.\'CountUnread\'', controller.call('error::ajax', {
            success(ret) {
                const count = parseInt($(ret).find('BPQL > body > count').text());
                if (count > 0) {
                    if (!alert) {
                        alert = $('<span />').addClass('alert');
                        $('#action-mailbox').append(alert);
                    }
                    alert.text(count.toString());

                } else if (alert) {
                    alert.remove();
                    alert = null;
                }
            }
        }));
    });

    const checkbox = (data, cb) => {
        cb();
        controller.call('inbox::check');
    };

    controller.registerTrigger('authentication::authenticated', 'inbox', checkbox);
    controller.registerTrigger('serverCommunication::websocket::sendMessage', 'inbox', checkbox);

    controller.registerBootstrap('inbox', callback => {
        callback();

        controller.call('inbox::check');

        $('#action-mailbox').click(e => {
            e.preventDefault();
            controller.call('inbox');
        });
    });

    controller.registerTrigger('bootstrap::end', 'message', (opts, cb) => {
        cb();
        if (!controller.query.message) return;

        controller.serverCommunication.call('SELECT FROM \'HARLANMESSAGES\'.\'GET\'',
            controller.call('error::ajax', controller.call('loader::ajax', {
                data: {
                    id: controller.query.message
                },
                success(message) {
                    controller.call('inbox::open', message, controller.query.message);
                }
            })));
    });

    controller.registerCall('inbox::open', (message, idMessage) => {
        let modal = controller.call('modal');
        modal.title($('message > subject', message).text());
        let when = moment.unix(parseInt($('message > send', message).text()));
        modal.subtitle(`Enviado às ${when.format('h:mm:ss a DD/MM/YYYY')}, ${when.fromNow()}.`);
        let markdownData = MarkdownIt.render($('message > text', message).text());
        let el = $('<div />').html(markdownData).addClass('markdown');
        modal.element().append(el);
        el.find('a').click(function (e) {
            controller.call('link', $(this).attr('href'), e);
            modal.close();
        });
        modal.createActions().cancel(null, 'Fechar');
    });

    const parseMessage = (list, message) => {
        const item = list.item('fa-envelope', [
            moment.unix(parseInt($('send', message).text())).format('DD/MM/YYYY, HH:mm:ss'),
            $('subject', message).text()
        ]);

        if ($('unread', message).text() === 'true') {
            item.addClass('unread');
        }

        item.click(() => {
            if (item.hasClass('unread')) {
                /* server-side read check */
                controller.call('inbox::check');
                item.removeClass('unread');
            }

            const idMessage = $('id', message).text();

            controller.serverCommunication.call('SELECT FROM \'HARLANMESSAGES\'.\'GET\'',
                controller.call('error::ajax', controller.call('loader::ajax', {
                    data: {
                        id: idMessage
                    },
                    success(message) {
                        controller.call('inbox::open', message, idMessage);
                    }
                })));
        });
    };

    const parseMessages = (list, messages) => {
        list.empty();
        messages.each((idx, node) => {
            parseMessage(list, node);
        });
    };

    const updateList = (
        modal,
        {next, back},
        results,
        pagination,
        list,
        limit = 5,
        skip = 0,
        text = null,
        callback = null,
        bipbopLoader = true
    ) => {
        if (!text || /^\s*$/.test(text)) {
            text = undefined;
        }

        controller.serverCommunication.call('SELECT FROM \'HARLANMESSAGES\'.\'SEARCH\'',
            controller.call('loader::ajax', {
                data: {
                    text,
                    skip,
                    limit
                },
                success: data => {
                    const queryResults = parseInt($('BPQL > body count', data).text());
                    const currentPage = Math.floor(skip / limit) + 1;
                    const pages = Math.ceil(queryResults / limit);

                    if (!queryResults) {
                        controller.call('alert', {
                            title: 'Não foram encontradas mensagens.',
                            subtitle: 'Aguarde até que mensagens sejam enviadas para poder usar esta funcionalidade.'
                        });
                        modal.close();
                        return;
                    }

                    next[currentPage >= pages ? 'hide' : 'show']();
                    back[currentPage <= 1 ? 'hide' : 'show']();

                    results.text(`Página ${currentPage} de ${pages}`);
                    pagination.text(`Resultados ${queryResults}`);

                    parseMessages(list, $('BPQL > body > messages > node', data));
                    if (callback) {
                        callback();
                    }
                }
            }, bipbopLoader));
    };

    controller.registerCall('inbox', () => {
        let skip = 0;
        let text = null;

        const modal = controller.call('modal');

        modal.title('Mensagens Privadas');
        modal.subtitle('Caixa de mensagens privadas.');
        modal.addParagraph('Aqui estão as mensagens importantes que o sistema tem para você, é importante que você leia todas. Mantendo sua caixa sempre zerada.');

        const form = modal.createForm();
        const search = form.addInput('text', 'text', 'Mensagem que procura');
        const list = form.createList();
        const actions = modal.createActions();

        actions.add('Sair').click(e => {
            e.preventDefault();
            modal.close();
        });

        const results = actions.observation();
        const pagination = actions.observation();

        const pageActions = {
            next: actions.add('Próxima Página').click(() => {
                skip += 5;
                updateList(modal, pageActions, results, pagination, list, 5, skip, text);
            }).hide(),

            back: actions.add('Página Anterior').click(() => {
                skip -= 5;
                updateList(modal, pageActions, results, pagination, list, 5, skip, text);
            }).hide()
        };

        updateList(modal, pageActions, results, pagination, list, 5, skip, text);
        controller.call('instantSearch', search, (query, autocomplete, callback) => {
            text = query;
            skip = 0;
            updateList(modal, pageActions, results, pagination, list, 5, skip, text, callback, false);
        });
    });
};
