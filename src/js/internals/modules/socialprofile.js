import { CPF, CNPJ } from 'cpf_cnpj';
import VMasker from 'vanilla-masker';
import e from '../library/server-communication/exception-dictionary';
import emailRegex from 'email-regex';
import { camelCase, titleCase } from 'change-case';
import socialIcons from './lib/social-icons';
import hashObject from 'hash-object';
import _ from 'underscore';
import detect from 'detect-gender';
import diacritics from 'diacritics';
import parallel from 'async/parallel';
import pad from 'pad';

const CRITERIA_COLOR = {
        "A1": "",
        "A2": "",
        "B1": "",
        "B2": "",
        "C1": "",
        "C2": "",
        "D": "",
        "E": ""
    },
    PHOTO_INTERVAL = 10000,
    corrigeArtigos = str => {
        _.each([
            'o', 'os', 'a', 'as', 'um', 'uns', 'uma', 'umas',
            'a', 'ao', 'aos', 'a', 'as',
            'de', 'do', 'dos', 'da', 'das', 'dum', 'duns', 'duma', 'dumas',
            'em', 'no', 'nos', 'na', 'nas', 'num', 'nuns', 'numa', 'numas',
            'por', 'per', 'pelo', 'pelos', 'pela', 'pelas'
        ], art => {
            str = str.replace(new RegExp(`\\s${art}\\s`, 'ig'), ` ${art} `);
        });
        return str;
    };


module.exports = controller => {

    var parseSocialProfile = (data, args) => {
        let socialProfiles = data.find("socialProfiles > socialProfiles");
        if (socialProfiles.length) {
            var socialProfilesContainer = $("<ul />").addClass("social-networks");
            socialProfiles.each((idx, socialProfile) => {
                let jSocialProfile = $(socialProfile),
                    socialProfileContainer = $("<li>"),
                    socialProfileHref = $("<a />").attr({
                        target: "_blank",
                        href: jSocialProfile.find("url").text(),
                        title: [
                            jSocialProfile.find("typeName").text(),
                            jSocialProfile.find("bio").text(),
                            jSocialProfile.find("followers").text(),
                            jSocialProfile.find("username").text()
                        ].filter(i => i).join(" - ")
                    }),
                    socialProfileIcon = $("<i />").addClass(`fa fa-${socialIcons[jSocialProfile.find("typeId").text()] || "external-link"}`);
                socialProfilesContainer.append(socialProfileContainer.append(socialProfileHref.append(socialProfileIcon)));
            });
            args.report.content().append(socialProfilesContainer);
        }

        let photos = data.find("photos > url").map((idx, item) => {
            return $(item).text();
        });

        if (photos.length) {
            let gamification = args.report.element().find(".gamification"),
                currentPhoto = 0,
                photosInterval,
                recoverPhoto = () => {

                    if (!gamification.is(":visible")) {
                        clearInterval(photosInterval);
                    }

                    let photo = photos[currentPhoto++ % photos.length],
                        image = new Image();

                    image.onload = () => gamification.css({
                        "background-image": `url("${photo}")`,
                        "background-size": "cover",
                        "background-color": "rgba(0, 0, 0, 0)",
                        "background-repeat": "no-repeat"
                    });

                    image.src = photo;

                };

            photosInterval = setInterval(recoverPhoto, PHOTO_INTERVAL);
            recoverPhoto();
        }

        let parseMoneyData = a => numeral(data.find(a).text()).format('$0,0.00'),
            subtitle = args.report.element().find("h3");

        args.report.label(`Classificação ${data.find("criteria").text()}`)
            .css("background-color", CRITERIA_COLOR[data.find("criteria").text()])
            .addClass("social-classification").attr("title", "Classificação Socioeconômica")
            .insertAfter(subtitle);

        args.report.label(`${parseMoneyData("buy-limit")} / ${parseMoneyData("buy-avg")}`)
            .addClass("buy-data").attr("title", "Teto e Valor Médio de Compra")
            .insertAfter(subtitle);

        args.report.label(`Idade aproximada de ${data.find("approximate-age").text()} anos`)
            .addClass("approximate-age").insertAfter(subtitle).css("margin-left", "0");

        data.find("topics > value").each((item, node) => {
            args.report.label($(node).text());
        });

        var organization = data.find("organizations > organizations").filter((idx, node) => {
            return $(node).find("isPrimary").text() == "true";
        }).first();
        if (organization.length) {
            $("<h4 />")
                .text([organization.find("name").text(), organization.find("title").text()].join(" na "))
                .insertAfter(args.report.element().find("h2"))
                .addClass("jobtitle");
        }

        data.find("organizations > organizations").each((idx, node) => {
            let jnode = $(node),
                companyName = jnode.find("name").text();

            if (!companyName) {
                return;
            }

            let result = null;
            args.mark("fa-suitcase", companyName, function(e) {
                e.preventDefault();
                let element = $(this);
                if (result) {
                    element.removeClass("enabled");
                    result.element().remove();
                    result = null;
                    return;
                }
                element.addClass("enabled");
                result = args.report.result();
                result.addItem("Empresa", companyName);
                result.addNonEmptyItem("Ocupação", jnode.find("title").text());
                result.addDateItem("Início", jnode.find("startDate").text(), "YYYY-MM-DD", "DD/MM/YYYY");
                result.addDateItem("Término", jnode.find("endDate").text(), "YYYY-MM-DD", "DD/MM/YYYY");
            });
        });

        data.find("scores > scores").each((item, node) => {
            let jnode = $(node);
            //args.report.score(jnode.find("provider").text(), parseInt(jnode.find("value").text(), 10));
        });
    };

    controller.registerTrigger("socialprofile::queryList", "socialprofile", (args, cb) => {
        cb();
        let item = args.timeline.add(null, "Obter informações socioeconômicas e de perfil na internet.",
            "Informações relacionadas ao aspecto econômico e social do indivíduo inferidas a partir do comportamento online e público. Qualifica em ordem de grandeza e confiabilidade entregando índices sociais, econômicos, jurídico, consumerista e comportamental.", [
                ["fa-folder-open", "Abrir", () => {
                    let email = _.uniq(Array.from(args.ccbusca.getElementsByTagName("email")).map(a => a.firstChild.nodeValue.trim()).filter(a => a))[0],
                        modal = controller.call("modal");

                    modal.title("E-mail para Cruzamento");
                    modal.subtitle(`Para maior assertividade digite o e-mail de ${corrigeArtigos(titleCase(args.name))}.`);
                    modal.paragraph(`O endereço de e-mail será utilizado junto do documento ${(CPF.isValid(args.document) ? CPF : CNPJ).format(args.document)} para cruzamentos em bases de dados online.`);

                    let form = modal.createForm(),
                        emailField = form.addInput("email", "email", "Endereço de e-mail do usuário (opcional).").val(email);

                    form.addSubmit("send", "Pesquisar");
                    form.element().submit(e => {
                        e.preventDefault();
                        modal.close();
                        controller.server.call("SELECT FROM 'SocialProfile'.'Consulta'",
                            controller.call("loader::ajax", controller.call("error::ajax", {
                                data: {
                                    documento: args.document,
                                    email: emailField.val()
                                },
                                success: data => {
                                    parseSocialProfile($(data), args);
                                    item.remove();
                                }
                            }), true));
                    });
                    modal.createActions().cancel();
                }]
            ]);
    });


    controller.registerTrigger("findDatabase::instantSearch", "socialprofile", function(args, callback) {
        let [text, modal] = args;
        let isCPF = CPF.isValid(text);

        if (!isCPF && !CNPJ.isValid(text)) {
            callback();
            return;
        }

        modal.item(`Análise para o documento ${(isCPF ? CPF: CNPJ).format(text)}`,
                "Obtenha informações detalhadas para o documento.",
                "Verifique telefone, e-mails, endereços e muito mais através da análise Harlan.")
            .addClass("socialprofile")
            .click(function() {
                controller.call("socialprofile", text);
            });
        callback();
    });


    var askBirthday = (stringDocument, callback) => {
        let modal = controller.call("modal");
        modal.title("Qual a data de nascimento?");
        modal.subtitle(`Será necessário que informe a data de nascimento para o documento ${stringDocument}.`);
        modal.paragraph("Essa verficação adicional é requerida em alguns casos para evitar pesquisas desncessárias e fraudes.");
        let form = modal.createForm(),
            nasc = form.addInput("nasc", "type", "Nascimento (dia/mês/ano)").mask("00/00/0000");

        form.element().submit(e => {
            e.preventDefault();
            let birthday = nasc.val();
            if (!moment(birthday, "DD/MM/YYYY").isValid()) {
                nasc.addClass("error");
                return;
            }
            modal.close();
            callback(birthday);
        });

        form.addSubmit("send", "Submeter");

        modal.createActions().cancel();
    };

    var openEmail = (report, email, document) => {
        return e => {
            e.preventDefault();
            window.open(`mailto:${email}`, '_blank');
        };
    };

    var openPhone = (report, ddd, numero, document) => {
        return e => {
            e.preventDefault();
            var modal = controller.confirm({
                icon: "phone-icon-7",
                title: "Você deseja realmente estabeler uma ligação?",
                subtitle: `Será realizada uma ligação para o número (${ddd}) ${VMasker.toPattern(numero, "9999-99999")}.`,
                paragraph: "Essa chamada poderá ser tarifada pela sua operadora VoIP, verifique os encargos vigentes antes de prosseguir. Para uma boa ligação se certifique de que haja banda de internet suficiente."
            }, () => {
                controller.call("softphone::call", `55${ddd}${numero}`);
            });
        };
    };

    var openGraph = (report, ccbusca, document) => {
        var result;
        return function(e) {
            e.preventDefault();

            if (result) {
                $(this).removeClass("enabled");
                result.element().remove();
                result = null;
                return;
            }

            result = report.result();
            result.element().addClass("network-screen");
            $(this).addClass("enabled");

            let generateRelations = controller.call("generateRelations");
            generateRelations.appendDocument(ccbusca, document);

            let network, node, ids = {},
                track = () => {

                    if (network) {
                        network.destroy();
                        network = null;
                    }

                    if (node) {
                        node.remove();
                        node = null;
                    }

                    generateRelations.track(data => {
                        [network, node] = result.addNetwork(data.nodes, data.edges, {
                            groups: data.groups
                        });

                        let oneclick = params => {
                            if (!params.nodes[0] || ids[params.nodes[0]]) {
                                return;
                            }

                            ids[params.nodes[0]] = true;

                            let getDocument = query =>
                                callback => controller.server.call(query, controller.call("loader::ajax", {
                                    data: {
                                        documento: pad(params.nodes[0].length > 11 ? 14 : 11, params.nodes[0], '0')
                                    },
                                    success: data => generateRelations.appendDocument(data, params.nodes[0]),
                                    complete: () => callback()
                                }, true));

                            parallel([
                                getDocument("SELECT FROM 'CCBUSCA'.'CONSULTA'"),
                                getDocument("SELECT FROM 'RFB'.'CERTIDAO'"),
                                getDocument("SELECT FROM 'CBUSCA'.'CONSULTA'"),
                            ], () => {
                                track();
                            });
                        }, doubleclick = params => controller.call("socialprofile", params.nodes[0]);

                        let clickTimer = null;
                        network.on("click", params => {
                            if (clickTimer) {
                                clearTimeout(clickTimer);
                                clickTimer = null;
                                doubleclick(params);
                                return;
                            }

                            clickTimer = setTimeout(() => {
                                oneclick(params);
                                clickTimer = null;
                            }, 400);
                        });
                    });
                };
            controller.server.call("SELECT FROM 'CBUSCA'.'CONSULTA'", controller.call("loader::ajax", {
                data: { documento : document },
                success: data => generateRelations.appendDocument(data, document),
                complete: () => track()
            }, true));
        };
    };

    var openAddress = (report, filterCep, ccbusca, document) => {
        var results = [];
        return function(e) {
            e.preventDefault();

            if (results.length) {
                $(this).removeClass("enabled");
                for (let result of results) {
                    result.element().remove();
                }

                results = [];
                return;
            }
            $(this).addClass("enabled");
            $("BPQL > body enderecos > endereco", ccbusca).each((i, element) => {
                let cep = $("cep", element).text().trim();
                if (filterCep && filterCep != cep) {
                    return /* void */;
                }

                let obj = {},
                    result = report.result(),
                    addItem = (key, value) => {
                        if (!value || /^\s*$/.test(value)) {
                            return;
                        }
                        obj[camelCase(diacritics.remove(key))] = value;
                        return result.addItem(key, value);
                    };

                results.push(result);
                addItem("Endereco", `${$("tipo", element).text().trim()} ${$("logradouro", element).text().trim()}`.trim());
                addItem("Número", $("numero", element).text().trim().replace(/^0+/, ''));
                addItem("Complemento", $("complemento", element).text().trim());
                addItem("Bairro", $("bairro", element).text().trim());
                addItem("CEP", cep);
                addItem("Bairro", $("bairro", element).text().trim());
                addItem("Cidade", $("cidade", element).text().trim());
                addItem("Estado", $("estado", element).text().trim());

                let image = new Image(),
                    imageAddress = "http://maps.googleapis.com/maps/api/staticmap?" + $.param({
                        "scale": "1",
                        "size": "600x150",
                        "maptype": "roadmap",
                        "format": "png",
                        "visual_refresh": "true",
                        "markers": "size:mid|color:red|label:1|" + _.values(obj).join(", ")
                    });

                image.onload = () => {
                    result.addItem().addClass("map").append(
                        $("<a />").attr({
                            "href": "https://www.google.com/maps?" + $.param({
                                q: _.values(obj).join(", ")
                            }),
                            "target": "_blank"
                        }).append($("<img />").attr("src", imageAddress)));
                };

                image.src = imageAddress;
            });
        };
    };

    var buildReport = (document, name, ccbusca = null, results = [], specialParameters = {}, callback = null) => {
        let report = controller.call("report"),
            isCPF = CPF.isValid(document);

        report.element().addClass("social-profile");
        if (callback) callback(report);

        report.title(corrigeArtigos(titleCase(name)));
        report.subtitle(`Informações relacionadas ao documento
            ${(isCPF ? CPF : CNPJ).format(document)}.`);

        let timeline = report.timeline(),
            paragraph = report.paragraph("Foram encontrados os seguintes apontamentos cadatrais para o documento em nossos bureaus de crédito, você pode clicar sobre uma informação para obter mais dados a respeito ou realizar uma ação, como enviar um e-mail, SMS, iniciar uma ligação.").hide(),
            m = report.markers(),
            newMark = (...args) => {
                paragraph.show();
                m(...args);
            };

        if (ccbusca) {
            $("BPQL > body telefones > telefone", ccbusca).each((idx, element) => {
                let ddd = $("ddd", element).text(),
                    numero = $("numero", element).text();
                if (!/^\d{2}$/.test(ddd) || !/^\d{8,9}$/.test(numero)) {
                    return /* void */;
                }
                newMark("fa-phone", `(${ddd}) ${VMasker.toPattern(numero, "9999-99999")}`, openPhone(report, ddd, numero, document));
            });

            $("BPQL > body emails > email > email", ccbusca).each((idx, element) => {
                let email = $(element).text();
                if (!emailRegex({
                        exact: true
                    }).test(email)) {
                    return /* void */;
                }
                newMark("fa-at", email, openEmail(report, email, document));
            });

            var addresses = {};
            $("BPQL > body enderecos > endereco", ccbusca).each((idx, element) => {
                let cidade = corrigeArtigos(titleCase($("cidade", element).text().replace(/\s+/, ' ').trim())),
                    estado = $("estado", element).text().replace(/\s+/, ' ').trim().toUpperCase(),
                    cep = $("cep", element).text().trim();

                if (/^\s*$/.test(cidade) || /^\s*$/.test(estado) || !/^\d{8}$/.test(cep)) {
                    return /* void */;
                }

                if (addresses[cep]) {
                    return /* void */;
                }

                addresses[cep] = true;

                newMark("fa-map", `${cidade}, ${estado} - ${VMasker.toPattern(cep, "99999-999")}`, openAddress(report, cep, ccbusca, document));
            });
        }

        newMark("fa-share-alt", "Relações", openGraph(report, ccbusca, document));

        controller.trigger("socialprofile::queryList", {
            report: report,
            timeline: timeline,
            name: name,
            ccbusca: ccbusca,
            document: document,
            mark: newMark
        });

        var game = report.gamification("silhouette").addClass(isCPF ? "cpf" : "cnpj");
        detect(name.split(" ")[0]).then(gender => {
            if (gender === 'female') {
                game.addClass("people-2");
            }
        });

        for (let result of results) {
            report.element().find(".results").append(result.element());
        }
        let relement = report.element();
        $(".app-content").prepend(relement);
        $("html, body").scrollTop(relement.offset().top);
    };

    var ccbusca = (document, name, results = [], specialParameters = {}, callback = null) => {
        controller.serverCommunication.call("SELECT FROM 'CCBUSCA'.'CONSULTA'",
            controller.call("loader::ajax", controller.call("loader::ajax", controller.call("error::ajax", {
                data: {
                    documento: document
                },
                success: ret => {
                    buildReport(document, name, ret, results, specialParameters, callback);
                },
                bipbopError: (exceptionType, exceptionMessage, exceptionCode) => {
                    buildReport(document, name, null, results, specialParameters, callback);
                    controller.call("error::server", exceptionType, exceptionMessage, exceptionCode);
                }
            })), true));
    };

    controller.registerCall("socialprofile", (document, specialParameters = {}, results = [], callback = null) => {
        let isCPF = CPF.isValid(document);

        /* Social Profile é para CPF ou CNPJ */
        if (!isCPF && !CNPJ.isValid(document)) {
            toastr.error("O documento inserido não é um CPF ou CNPJ válido.");
            return;
        }

        controller.server.call("SELECT FROM 'BIPBOPJS'.'CPFCNPJ'",
            controller.call("error::ajax", controller.call("loader::ajax", {
                data: $.extend({
                    documento: document
                }, specialParameters),
                success: ret => {
                    ccbusca(document, $("BPQL > body nome", ret).text(), results, specialParameters, callback);
                },
                bipbopError: (exceptionType, exceptionMessage, exceptionCode) => {
                    if (isCPF && exceptionType == "ExceptionDatabase" &&
                        exceptionCode == e.ExceptionDatabase.missingArgument) {
                        askBirthday(CPF.format(document), birthday => {
                            controller.call("socialprofile", document, $.extend({}, specialParameters, {
                                nascimento: birthday
                            }), results, callback);
                        });
                        return;
                    }
                    controller.call("error::server", exceptionType, exceptionMessage, exceptionCode);
                }
            })));
    });

    controller.registerTrigger("socialprofile::queryList", "certidaoCNPJ", (args, cb) => {
        if (!CNPJ.isValid(args.document)) {
            cb();
            return;
        }
        controller.server.call("SELECT FROM 'RFB'.'CERTIDAO'", {
            data: {
                documento: args.document
            },
            success: ret => {
                args.report.results.append(controller.call("xmlDocument", ret, 'RFB', 'CERTIDAO'));
            },
            complete: () => {
                cb();
            }
        });
    });

};
