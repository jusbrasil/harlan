/* global module */

import _ from "underscore";
import sprintf from "sprintf";
import {
    CPF,
    CNPJ
} from "cpf_cnpj";

var formDescription = {
    "title": "Criação de Subconta",
    "subtitle": "Preencha os dados abaixo.",
    "paragraph": "As subchaves possibilitam você trabalhar em um cadastro independente.",
    "gamification": "star",
    "screens": [{
        "magicLabel": true,
        "fields": [{
                "name": "alias",
                "type": "text",
                "placeholder": "Nome de Usuário",
                "labelText": "Nome de Usuário",
                "optional": false
            },
            [{
                "name": "password",
                "type": "password",
                "placeholder": "Senha",
                "labelText": "Senha",
                "optional": false
            }, {
                "name": "repeat-password",
                "type": "password",
                "placeholder": "Repita sua Senha",
                "labelText": "Repita sua Senha",
                "optional": false
            }],
            [{
                "name": "name",
                "type": "text",
                "placeholder": "Nome (opcional)",
                "optional": true,
                "labelText": "Nome"
            }, {
                "name": "zipcode",
                "type": "text",
                "placeholder": "CEP (opcional)",
                "optional": true,
                "labelText": "CEP",
                "mask": "00000-000"
            }],
            [{
                "name": "email",
                "type": "text",
                "placeholder": "E-mail (opcional)",
                "optional": true,
                "labelText": "E-mail"
            }, {
                "name": "phone",
                "type": "text",
                "placeholder": "Telefone (opcional)",
                "labelText": "Telefone",
                "mask": "(00) 0000-00009",
                "optional": true
            }],
            [{
                "name": "cpf",
                "type": "text",
                "placeholder": "CPF (opcional)",
                "labelText": "CPF",
                "mask": "000.000.000-00",
                "optional": true,
                "maskOptions": {
                    "reverse": true
                }
            }, {
                "name": "cnpj",
                "type": "text",
                "placeholder": "CNPJ (opcional)",
                "labelText": "CNPJ",
                "mask": "00.000.000/0000-00",
                "optional": true,
                "maskOptions": {
                    "reverse": true
                }
            }]
        ]
    }]
};
module.exports = function(controller) {

    controller.confs.subaccount = {
        icons: ["fa-key", "fa-folder-open", "fa-cogs"]
    };

    controller.endpoint.subaccountCreate = "SELECT FROM 'BIPBOPAPIKEY'.'GENERATE'";

    var register = function(data) {
        controller.serverCommunication.call(controller.endpoint.subaccountCreate,
            controller.call("error::ajax", {
                data: data,
                success: function(data) {
                    controller.call("alert", {
                        icon: "pass",
                        title: `Subconta ${$(data).find("BPQL > body > company > username").text()}  com Sucesso`,
                        subtitle: "Agora você já pode acessar esse novo usuário.",
                        paragraph: `A chave de API <strong class="apiKey">${$(data).find("BPQL > body > company > apiKey").text()}</strong> do usuário ${$(data).find("BPQL > body > company > username").text()} deve ser manipulada com segurança absoluta, não devendo ser repassada a terceiros. Tenha certeza que você sabe o que está fazendo.`
                    });
                }
            }));
    };

    controller.registerCall("subaccount::create", function() {
        var form = controller.call("form", register);
        form.configure(formDescription);
    });

    controller.registerCall("subaccount::limit", function(apiKey) {
        controller.server.call("SELECT FROM 'BIPBOPAPIKEY'.'QUERY'",
            controller.call("error::ajax", controller.call("loader::ajax", {
                data: {
                    apiKey: apiKey
                },
                success: ret => {
                    var form = controller.call("form", confs => {
                        controller.server.call("SELECT FROM 'BIPBOPAPIKEY'.'UPDATE'", {
                            data: $.extend({
                                apiKey: apiKey,
                            }, confs),
                            success: () => {
                                toastr.success("Suas configurações de usuário foram atualizadas.");
                            }
                        });

                    });
                    form.configure({
                        title: "Configuração de Subconta",
                        subtitle: "Gerencie os parâmetros da subconta.",
                        paragraph: "Limite a quantidade de consultas que uma subconta é capaz de realizar.",
                        gamification: "lock",
                        screens: [{
                            magicLabel: true,
                            fields: [{
                                value: $("limit", ret).text(),
                                name: "limit",
                                type: "text",
                                placeholder: "Quantidade de Consultas (0 para ilimitado)",
                                labelText: "Quantidade de Consultas (0 para ilimitado)",
                                optional: false,
                                mask: "000.000.000.000.000",
                                numeral: true,
                                maskOptions: {
                                    reverse: true
                                },
                            }, {
                                value: $("day-limit", ret).text(),
                                name: "dayLimit",
                                type: "text",
                                placeholder: "Data de Vencimento (max. dia 25)",
                                labelText: "Data de Vencimento (max. dia 25)",
                                optional: false,
                                mask: "09",
                                numeral: true,
                                maskOptions: {
                                    reverse: true
                                },
                                validate: function(item) {
                                    var dayLimit = parseInt(item.element.val(), 10);
                                    return dayLimit > 0 && dayLimit <= 25;
                                }
                            }]
                        }]
                    });
                }
            })));
    });

    var companyDraw = (list, data, isAdmin, modal) => {

        var icons = [...controller.confs.subaccount.icons];
        if (isAdmin) icons.push("fa-edit");

        list.empty();
        $("BPQL > body > company", data).each(function(idx, item) {
            var status = $("status", item).text() === "1",
                cpf = $("cpf", item).text(),
                cnpj = $("cnpj", item).text(),
                username = $("username", item).text(),
                apiKey = $("apiKey", item).text();

            var iconStatus = function() {
                return (status ? "fa-check" : "fa-times") + " block";
            };


            var acc = list.add([iconStatus()].concat(icons), [cnpj ? CNPJ.format(cnpj) : (cpf ? CPF.format(cpf) : "Sem Documento"), username]);
            acc.find(".fa-key").click(e => {
                e.preventDefault();
                controller.call("alert", {
                    icon: "locked",
                    title: "Chave de API",
                    subtitle: "Atenção! Manipule com segurança.",
                    paragraph: `A chave de API <strong class="apiKey">${apiKey}</strong> do usuário ${username} deve ser manipulada com segurança absoluta, não devendo ser repassada a terceiros. Tenha certeza que você sabe o que está fazendo.`
                });
            });
            acc.find(".fa-cogs").click(controller.click("subaccount::limit", apiKey));
            acc.find(".fa-edit").click((e) => {
                e.preventDefault();
                modal.close();
                controller.call("admin::viewCompany", item);
            });
            acc.find(".fa-folder-open").click(controller.click("confirm", {
                icon: "powerUp",
                title: "Você deseja se conectar a essa subconta?",
                subtitle: "Você será redirecionado para uma conta derivada.",
                paragraph: "As contas derivadas podem ser administradas por você, a qualquer momento você pode as acessar e editar."
            }, () => {
                window.open(`${document.location.protocol}\/\/${document.location.host}?apiKey=${encodeURIComponent(apiKey)}`);
            }));
            acc.find(".block").click(e => {
                e.preventDefault();
                var unregisterLoader = $.bipbopLoader.register();
                controller.serverCommunication.call("SELECT FROM 'BIPBOPAPIKEY'.'CHANGESTATUS'", {
                    data: {
                        username: username,
                    },
                    success: function() {
                        status = !status;
                        acc.find(".block").removeClass("fa-check fa-times").addClass(iconStatus());
                    },
                    complete: function() {
                        unregisterLoader();
                    }
                });
            });
        });
    };

    var updateList = (modal, pageActions, results, pagination, list, autoCreate = false, limit = 5, skip = 0, text = null, callback = null, bipbopLoader = true, companyNode = null, username = null, section = null) => {
        if (!text || /^\s*$/.test(text)) {
            text = undefined;
        }


        controller.serverCommunication.call("SELECT FROM 'BIPBOPAPIKEY'.'LIST'",
            controller.call("loader::ajax", {
                data: {
                    username: text,
                    skip: skip,
                    limit: limit,
                    owner: username
                },
                success: data => {
                    var queryResults = parseInt($("BPQL > body count", data).text()),
                        currentPage = Math.floor(skip / limit) + 1,
                        pages = Math.ceil(queryResults / limit);

                    if (!queryResults && autoCreate) {
                        modal.close();
                        controller.call("subaccount::create");
                        return;
                    }

                    pageActions.next[currentPage >= pages ? "hide" : "show"]();
                    pageActions.back[currentPage <= 1 ? "hide" : "show"]();

                    results.text(`Página ${currentPage} de ${pages}`);
                    pagination.text(`Resultados ${queryResults}`);

                    companyDraw(list, data, companyNode ? true : false, modal);
                    if (callback) {
                        callback();
                    }
                }
            }, bipbopLoader));
    };

    controller.registerCall("subaccount::list", function(companyNode, username, section) {
        var modal = controller.call("modal");
        modal.title("Gestão de Subcontas");
        modal.subtitle("Crie e Bloqueie Subchaves");
        modal.addParagraph("A gestão de subcontas permite você administrar múltiplos usuários.");

        var form = modal.createForm(),
            search = form.addInput("username", "text", "Nome de usuário que procura"),
            list = form.createList(),
            actions = modal.createActions(),
            skip = 0,
            text = null;
        form.element().submit(function(e) {
            e.preventDefault();
            controller.call("subaccount::create");
            modal.close();
        });

        form.addSubmit("create-subaccount", "Criar Subconta");
        actions.add("Sair").click(function(e) {
            e.preventDefault();
            modal.close();
        });

        var results = actions.observation(),
            pagination = actions.observation();

        var pageActions = {
            next: actions.add("Próxima Página").click(() => {
                skip += 5;
                updateList(modal, pageActions, results, pagination, list, false, 5, skip, text, null, true, companyNode, username, section);
            }).hide(),

            back: actions.add("Página Anterior").click(() => {
                skip -= 5;
                updateList(modal, pageActions, results, pagination, list, false, 5, skip, text, null, true, companyNode, username, section);
            }).hide()
        };

        updateList(modal, pageActions, results, pagination, list, true, 5, skip, text, null, false, companyNode, username, section);
        controller.call("instantSearch", search, (query, autocomplete, callback) => {
            text = query;
            skip = 0;
            updateList(modal, pageActions, results, pagination, list, false, 5, skip, text, callback, true, companyNode, username, section);
        });
    });

    controller.registerBootstrap("subaccount", function(cb) {
        cb();
        $("#action-subaccount").click(function(e) {
            e.preventDefault();
            controller.call("subaccount::list");
        });
    });

    controller.registerCall("subaccount::formDescription", function(newDescription) {
        formDescription = newDescription;
    });
};
