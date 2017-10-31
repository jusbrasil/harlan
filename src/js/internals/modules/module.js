var FIND_MODULE = "BPQL > body > module > node";

module.exports = function (controller) {

    var installedModules = null;

    var addScript = function (src, callback) {
        try {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.onload = callback;
            script.src = src;
            document.getElementsByTagName('head')[0].appendChild(script);
            return script;
        } catch (e) {
            console.error(e);
        }
    };

    controller.registerTrigger("authentication::authenticated", "module::authenticated", function (args, callback) {
        controller.serverCommunication.call("SELECT FROM 'HARLANMODULES'.'JS'", {
            error: function () {
                callback(Array.from(arguments));
            },
            success: function (ret) {

                installedModules = ret;

                var modules = $(ret).find(FIND_MODULE);
                var scripts = modules.length;

                if (!scripts) {
                    callback();
                    return;
                }

                var onLoad = function () {
                    if (!--scripts) {
                        controller.trigger("plugin::authenticated", args);
                        callback();
                    }
                };

                modules.each(function (idx, node) {
                    addScript($(node).text(), onLoad);
                });

            }
        });
    });

    controller.registerBootstrap("module", function (callback) {
        callback();
        $("#action-show-modules").click(function (e) {
            e.preventDefault();
            controller.call("module");
        });
    });

    var removeModule = function (e) {
        e.preventDefault();

        var jelement = $(this);

        var modal = controller.call("modal");
        modal.title("Administrador de Módulos");
        modal.subtitle("Deseja realmente remover esse módulo?");
        modal.addParagraph("Após remover será necessário você reiniciar a aplicação para que suas alterações tenham efeito.");
        var form = modal.createForm();
        form.element().submit(function (e) {
            e.preventDefault();
            controller.serverCommunication.call("DELETE FROM 'HARLANMODULES'.'JS'",
                    controller.call("error::ajax", controller.call("loader::ajax", {
                        data: {
                            module: jelement.data("module")
                        },
                        success: function (ret) {
                            installedModules = ret;
                            jelement.remove();
                            toastr.success("Módulo removido com sucesso.", "Reinicie o sistema.");
                        }
                    })));
            modal.close();
        });

        form.addSubmit("continue", "Remover Módulo");
        modal.createActions().cancel();

    };

    controller.registerCall("module", function () {
        var modal = controller.call("modal");
        modal.title("Administrador de Módulos");
        modal.subtitle("Enriqueça seu sistema com módulos.");
        modal.addParagraph("O sistema de módulos foi desenvolvido para que nós e terceiros possam adicionar novas funcionalidades ao sistema. Para agregar um módulo a sua interface é necessário que digite abaixo o ENDPOINT do JavaScript a ser requisitado.");

        var form = modal.createForm();

        if (installedModules) {
            var list = form.createList();
            $(installedModules).find(FIND_MODULE).each(function (idx, node) {
                var module = $(node).text();
                list.item("fa-times", module).data("module", module).click(removeModule);
            });
            list.element().addClass("remove-modules");
        }

        var module = form.addInput("module", "text", "Endereço do módulo.");
        form.addSubmit("continue", "Adicionar Módulo");
        modal.createActions().cancel();

        form.element().submit(function (e) {
            e.preventDefault();
            controller.serverCommunication.call("INSERT INTO 'HARLANMODULES'.'JS'",
                    controller.call("error::ajax", controller.call("loader::ajax", {
                        data: {
                            module: module.val()
                        },
                        success: function (ret) {
                            installedModules = ret;
                            toastr.success("Módulo adicionado com sucesso.");
                            addScript(module.val());
                        }
                    })));
            modal.close();
        });
    });
};
