import _ from 'underscore';
import { CPF, CNPJ } from 'cpf_cnpj';
import sprintf from 'sprintf';

module.exports = (controller) => {

    var generateActions = (data, entity) => {

        let items = [
            ["fa-search", "Pesquisar", () => controller.call("socialprofile", entity.label)],
            ["fa-archive", "Histórico", () => controller.call("dive::history", entity)]
        ];


        if (data) {

            var update = (useful) => {
                return (obj) => {
                    obj.item.remove();
                    controller.server.call("UPDATE 'DIVE'.'EVENT'", {
                        dataType: "json",
                        type: "POST",
                        data: {
                            useful: useful,
                            id: entity._id
                        },
                        complete: () => {
                            getActions({
                                limit: 1,
                                skip: timeline.length()
                            });
                        }
                    });
                };
            };

            items.push(["fa-check", "Relevante", update(true)]);
            items.push(["fa-times", "Irrelevante", update(false)]);
        } else {
            items.push(['fa-trash', "Remover", (obj) => {
                obj.item.remove();
                controller.server.call("DELETE FROM 'DIVE'.'ENTITY'", {
                    dataType: "json",
                    type: "POST",
                    data: {
                        id: entity._id
                    },
                    complete: () => {
                        getActions({
                            limit: 1,
                            skip: timeline.length()
                        });
                    }
                });
            }]);

            items.push(['fa-list-alt', "Eventos", () => {
                var report = controller.call("report",
                    `Linha do Tempo para o Documento ${entity.label}`,
                    "Monitore de perto, e em tempo real, as ações de pessoas físicas e jurídicas.",
                    "Com essa ferramenta, informe-se em tempo real de todas as atividades de pessoas físicas e jurídicas de seu interesse. Saiba de tudo o que acontece e tenha avaliações de crédito imediatas, de forma contínua e precisa.");

                let timeline = report.timeline(controller);

                controller.server.call("SELECT FROM 'DIVE'.'EVENTS'", {
                    dataType: "json",
                    data: {
                        entity: entity._id
                    },
                    success: function(ret) {
                        for (let data of ret.events) {
                            timeline.add(data.created, data.title, data.description, generateActions(data, data.entity)).attr("data-entity", data.entity._id);
                        }
                    }
                });


                // controller.registerTrigger("serverCommunication::websocket::diveEvent", "diveEvent", (data, cb) => {
                //     cb();
                //     timeline.add(data.created, data.title, data.description, generateActions(data, data.entity)).attr("data-entity", data.entity._id);
                // });

                report.gamification("accuracy");
                $(".app-content").append(report.element());
                $(window).scrollTop(report.element().offset().top);
            }]);
        }

        return items;
    };


    controller.registerCall("dive::generateActions", generateActions);

    controller.registerTrigger("findDatabase::instantSearch", "dive::search::document", function(args, callback) {
        controller.server.call("SELECT FROM 'DIVE'.'ENTITYS'", {
            dataType: "json",
            data: {
                text: args[0],
                limit: 3
            },
            success: (data) => {
                let document;
                if (!data.count) return;
                for (let row of _.values(data.items)) {
                    document = CPF.isValid(row.label) ? CPF.format(row.label) : CNPJ.format(row.label);
                    args[1].item("Dive", "Abertura de Registro", sprintf("Nome: %s, Documento: %s", row.reduce.name, document))
                        .addClass("dive")
                        .click(e => {
                            e.preventDefault();
                            controller.call("dive::open", row);
                        });
                }
            },
            complete: () => callback()
        });
    });

    controller.registerCall("dive::open", (entity) => {
        var sectionDocumentGroup = controller.call("section", "Informações Cadastrais",
            `Informações cadastrais para o documento ${entity.label}`,
            "Dívida, telefone, endereço, e-mails e outras informações.");
        var [section, results, actions] = sectionDocumentGroup;
        $("html, body").scrollTop(section.offset().top);

        $(".app-content").prepend(section);

        controller.call("tooltip", actions, "Pesquisar").append($("<i />").addClass("fa fa-search"))
            .click(controller.click("socialprofile", entity.label, undefined, undefined, (report) => {
                report.element().append(section);
            }));


        for (let hyperlink of _.values(entity.hyperlink)) {
            controller.call("dive::plugin", hyperlink, {
                data: entity,
                section: sectionDocumentGroup
            });
        }

        controller.call("tooltip", actions, "Apagar").append($("<i />").addClass("fa fa-trash"))
            .click((e) => {
                controller.call("dive::delete", entity, () => {
                    section.remove();
                });
            });

        controller.call("tooltip", actions, "Histórico").append($("<i />").addClass("fa fa-archive"))
            .click((e) => {
                controller.call("dive::history", entity);
            });

        controller.call("tooltip", actions, "Informações Globais").append($("<i />").addClass("fa fa-database"))
            .click((e) => {
                e.preventDefault();
                for (let push of entity.push) {
                    controller.server.call("SELECT FROM 'PUSHDIVE'.'DOCUMENT'",
                        controller.call("loader::ajax", {
                            data: {
                                id: push.id
                            },
                            success: ret => results.prepend(controller.call("xmlDocument", ret))
                        }, true));
                }
            });


    });

    controller.registerCall("dive::entity::timeline", (timeline, entity) => {
        timeline.add(entity.created, `Acompanhamento ${entity.reduce.name ? 'para ' + entity.reduce.name : ''}, documento ${(CPF.isValid(entity.label) ? CPF : CNPJ).format(entity.label)}.`,
            'O documento está sendo acompanhado e qualquer novo evento será notificado.', generateActions(null, entity)).attr("data-entity", entity._id);
    });

    controller.registerTrigger(["plugin::authenticated", "authentication::authenticated"], "dive::events", function(arg, cb) {
        cb();
        var report = controller.call("report",
            "Acompanhamento Cadastral e Análise de Crédito",
            "Monitore de perto, e em tempo real, as ações de pessoas físicas e jurídicas.",
            "Com essa ferramenta, informe-se em tempo real de todas as atividades de pessoas físicas e jurídicas de seu interesse. Saiba de tudo o que acontece e tenha avaliações de crédito imediatas, de forma contínua e precisa.",
            false);

        let watchEntityTimeline = report.timeline(controller);
        controller.server.call("SELECT FROM 'DIVE'.'ENTITYS'", {
            dataType: "json",
            success: function(ret) {
                for (let entity of _.values(ret.items)) {
                    controller.call("dive::entity::timeline", watchEntityTimeline, entity);
                }
            }
        });


        controller.registerTrigger("serverCommunication::websocket::DatabaseDive", "DatabaseDive", (entity, cb) => {
            cb();
            controller.call("dive::entity::timeline", watchEntityTimeline, entity);
        });

        report.button("Adicionar Acompanhamento", () => controller.call("dive::new"));

        report.gamification("dive");
        $(".app-content").append(report.element());
    });

};
