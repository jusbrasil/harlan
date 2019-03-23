const FIND_MODULE = 'BPQL > body > module > node';

module.exports = controller => {

    let installedModules = null;

    const addScript = (src, callback) => {
        try {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.onload = callback;
            script.src = src;
            document.getElementsByTagName('head')[0].appendChild(script);
            return script;
        } catch (e) {
            /* pass */
        }
    };

    controller.registerTrigger('authentication::authenticated', 'module::authenticated', (args, callback) => {
        controller.serverCommunication.call('SELECT FROM \'HARLANMODULES\'.\'JS\'', controller.call('error::ajax', {
            error() {
                callback(Array.from(arguments));
            },
            success(ret) {

                installedModules = ret;

                const modules = $(ret).find(FIND_MODULE);
                let scripts = modules.length;

                if (!scripts) {
                    callback();
                    return;
                }

                const onLoad = () => {
                    if (!--scripts) {
                        controller.trigger('plugin::authenticated', args);
                        callback();
                    }
                };

                modules.each((idx, node) => {
                    addScript($(node).text(), onLoad);
                });

            }
        }));
    });

    controller.registerBootstrap('module', callback => {
        callback();
        $('#action-show-modules').click(e => {
            e.preventDefault();
            controller.call('module');
        });
    });

    const removeModule = function (e) {
        e.preventDefault();

        const jelement = $(this);

        const modal = controller.call('modal');
        modal.title('Administrador de Módulos');
        modal.subtitle('Deseja realmente remover esse módulo?');
        modal.addParagraph('Após remover será necessário você reiniciar a aplicação para que suas alterações tenham efeito.');
        const form = modal.createForm();
        form.element().submit(e => {
            e.preventDefault();
            controller.serverCommunication.call('DELETE FROM \'HARLANMODULES\'.\'JS\'',
                controller.call('error::ajax', controller.call('loader::ajax', {
                    data: {
                        module: jelement.data('module')
                    },
                    success(ret) {
                        installedModules = ret;
                        jelement.remove();
                        toastr.success('Módulo removido com sucesso.', 'Reinicie o sistema.');
                    }
                })));
            modal.close();
        });

        form.addSubmit('continue', 'Remover Módulo');
        modal.createActions().cancel();

    };

    controller.registerCall('module', () => {
        const modal = controller.call('modal');
        modal.title('Administrador de Módulos');
        modal.subtitle('Enriqueça seu sistema com módulos.');
        modal.addParagraph('O sistema de módulos foi desenvolvido para que nós e terceiros possam adicionar novas funcionalidades ao sistema. Para agregar um módulo a sua interface é necessário que digite abaixo o ENDPOINT do JavaScript a ser requisitado.');

        const form = modal.createForm();

        if (installedModules) {
            const list = form.createList();
            $(installedModules).find(FIND_MODULE).each((idx, node) => {
                const module = $(node).text();
                list.item('fa-times', module).data('module', module).click(removeModule);
            });
            list.element().addClass('remove-modules');
        }

        const module = form.addInput('module', 'text', 'Endereço do módulo.');
        form.addSubmit('continue', 'Adicionar Módulo');
        modal.createActions().cancel();

        form.element().submit(e => {
            e.preventDefault();
            controller.serverCommunication.call('INSERT INTO \'HARLANMODULES\'.\'JS\'',
                controller.call('error::ajax', controller.call('loader::ajax', {
                    data: {
                        module: module.val()
                    },
                    success(ret) {
                        installedModules = ret;
                        toastr.success('Módulo adicionado com sucesso.');
                        addScript(module.val());
                    }
                })));
            modal.close();
        });
    });
};
