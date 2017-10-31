/*jshint -W083 */

import {
    CPF,
    CNPJ
} from "cpf_cnpj";
import async from "async";
import _ from "underscore";
import VMasker from 'vanilla-masker';
import pad from 'pad';
import {
    KronoosParse
} from './parser';
import {
    KronoosStats
} from './stats';
import {
    KronoosMap
} from './map';

const removeDiacritics = require('diacritics').remove;

const CNJ_REGEX_TPL = '(\\s|^)(\\d{7}\\-?\\d{2}.?\\d{4}\\.?\\d{1}\\.?\\d{2}\\.?\\d{4})(\\s|$)';
const CNJ_REGEX = new RegExp(CNJ_REGEX_TPL);
const NON_NUMBER = /[^\d]/g;
const R_EARTH = 6378137;

const BACKGROUND_IMAGES = {
    calculator: "/images/bg/kronoos/photodune-11794453-desk-office-business-financial-accounting-calculate-l.jpg",
    notebook: "/images/bg/kronoos/photodune-13159493-close-up-of-womans-hand-using-laptop-with-notebook-l.jpg",
    officeStore: "/images/bg/kronoos/photodune-4129670-library-dossier-office-store-interior-full-of-indexcases-indexbox-files-l.jpg"
};

module.exports = function(controller) {

    var xhr = [],
        photos = [],
        parsers = [],
        registered,
        backgroundTimeout,
        mapQueue,
        photosQueue,
        brief,
        searchTimeout,
        depth = controller.query.d ? parseInt(controller.query.d) : 0;

    const INPUT = $("#kronoos-q");
    const SEARCH_BAR = $(".kronoos-application .search-bar");
    const KRONOOS_LOGO = $(".kronoos-application .kronoos-logo");
    const KRONOOS_ACTION = $("#kronoos-action");
    const KRONOOS_SEARCH_BY_NAME = $(".kronoos-application .icon");
    const KRONOOS_DEPTH = $(".kronoos-application .depth");

    KRONOOS_SEARCH_BY_NAME.click(controller.click("kronoos::searchByName"));

    KRONOOS_DEPTH.addClass(`fa-thermometer-${depth}`);
    KRONOOS_DEPTH.click((e) => {
        e.preventDefault();
        KRONOOS_DEPTH.removeClass(`fa-thermometer-${depth}`);
        if (++depth > 4) depth = 0;
        KRONOOS_DEPTH.addClass(`fa-thermometer-${depth}`);
        if (depth > 1) {
            toastr.success(`Profundidade automática de consulta ajustada para ${depth} nós.`, "Profundidade de Pesquisa");
        } else if (depth) {
            toastr.warning(`Profundidade automática de consulta ajustada para um nó.`, "Profundidade de Pesquisa");
        } else {
            toastr.warning(`Profundidade automática desabilidade.`, "Profundidade de Pesquisa");
        }
    });

    KRONOOS_LOGO.css("cursor", "pointer");
    KRONOOS_LOGO.click((e) => {
        e.preventDefault();
        if (SEARCH_BAR.hasClass("full")) {
            SEARCH_BAR.removeClass("full").addClass("minimize");
        } else {
            SEARCH_BAR.addClass("full").removeClass("minimize");
        }
    });

    var clearAll;
    controller.registerCall("kronoos::clearAll", clearAll = () => {

        for (let parser of parsers) {
            parser.kill();
        }

        parsers = [];

        if (brief) {
            brief.element.remove();
            brief = null;
        }

        if (mapQueue) {
            mapQueue.kill();
            mapQueue = null;
        }

        if (photosQueue) {
            photosQueue.kill();
            photosQueue = null;
        }

        clearInterval(registered);
        clearTimeout(backgroundTimeout);

        if (xhr) {
            for (let ajax of xhr) {
                ajax.abort();
                /* Default Status */
            }
        }

        xhr = [];
        photos = [];

        SEARCH_BAR.css("background-image", `url(${BACKGROUND_IMAGES.notebook})`);
        $(".kronoos-application .status-message").remove();
        $(".kronoos-result").empty();
        SEARCH_BAR.addClass("full").removeClass("minimize");
    });

    controller.registerTrigger("kronoos::changeResult", (data, callback) => {
        callback();
        if (!brief) return;
        if (!brief.list.is(":empty")) return;

        brief.element.remove();
        brief = null;
    });

    let getBrief = () => {
        if (!brief) {
            brief = new KronoosStats();
            $(".kronoos-result").prepend(brief.element);
        }
        return brief;
    };

    KRONOOS_ACTION.submit((e) => {
        $(INPUT).blur();
        e.preventDefault();
        clearAll();

        controller.call("kronoos::contractAccepted::app", () => {

            let document = INPUT.val();

            var SPECIAL_MATCH = /^\s*123\.?456\.?789\-?10\s*$/.test(document);
            if (!CPF.isValid(document) && !CNPJ.isValid(document) && !SPECIAL_MATCH) {
                toastr.error("O documento informado não é um CPF ou CNPJ válido.",
                    "Preencha um CPF ou CNPJ válido para poder realizar a consulta Kronoos");
                return;
            }

            if (SPECIAL_MATCH) {
                return controller.call("kronoos::search", document, "John Doe", true);
            }

            $(".kronoos-print-document").text((CPF.isValid(document) ? CPF : CNPJ).format(document));

            xhr.push(controller.server.call("SELECT FROM 'BIPBOPJS'.'CPFCNPJ'",
                controller.call("kronoos::status::ajax", "fa-user", `Capturando dados de identidade através do documento ${document}.`, {
                    data: {
                        documento: document,
                        kronoos: true

                    },
                    success: (ret) => controller.call("kronoos::ccbusca", $("BPQL > body > nome", ret).first().text(), document),
                    error: () => controller.call("kronoos::ccbusca", null, document)
                })));
        });
    });

    controller.registerCall("kronoos::parse", (name, document, kronoosData, cbuscaData = null, style = "maximized", parameters = {}) => {
        let kronoosParse = new KronoosParse(controller, depth, name, document, kronoosData, cbuscaData, style, parameters, getBrief);
        parsers.push(kronoosParse);
        return kronoosParse;
    });

    controller.registerCall("kronoos::ccbusca", (name, document, specialMatch) => {
        if (specialMatch) {
            controller.call("kronoos::search", document, name, ret);
        }

        let findBureau = (callback, query, data = {}) => xhr.push(controller.server.call(query,
            controller.call("kronoos::status::ajax", "fa-bank", `Acessando bureau de crédito para ${name || ""} ${document}.`, {
                method: 'GET',
                data: Object.assign({
                    documento: document,
                }, data),
                error: () => callback("Can't use that query"),
                success: (ret) => callback(null, ret)
            })));


        async.tryEach([
            (callback) => findBureau(callback, "USING 'CCBUSCA' SELECT FROM 'FINDER'.'CONSULTA'", {
                'q[0]': "USING 'CCBUSCA' SELECT FROM 'FINDER'.'CONSULTA'",
                'q[1]': "SELECT FROM 'CCBUSCA'.'CONSULTA'",
            }),
            (callback) => findBureau(callback, "SELECT FROM 'CCBUSCA'.'CONSULTA'")
        ], (err, ret) => {
            if (err) return;
            name = name || $("BPQL > body cadastro > nome", ret).first().text();
            if (CNPJ.isValid(document)) {
                xhr.push(controller.server.call("SELECT FROM 'RFB'.'CERTIDAO'",
                    controller.call("kronoos::status::ajax", "fa-bank", `Capturando certidão CNPJ para ${name || ""} ${document}.`, {
                        method: 'GET',
                        data: {
                            documento: document
                        },
                        error: () => {
                            name = name || $("BPQL > body cadastro > nome", ret).first().text();
                            controller.call("kronoos::search", document, name, ret);
                        },
                        success: (rfb) => {
                            name = $("nome", rfb).first().text() || name;
                            controller.call("kronoos::search", document, name, ret);
                        }
                    })));
                return;
            }
            controller.call("kronoos::search", document, name, ret);
        });
    });

    controller.registerCall("kronoos::search", (document, name, cbuscaData) => {
        xhr.push(controller.server.call("SELECT FROM 'KRONOOS'.'API'", controller.call("error::ajax",
            controller.call("kronoos::status::ajax", "fa-user", `Pesquisando correlações através do nome ${name}, documento ${document}.`, {
                data: {
                    documento: document,
                    name: `"${name}"`
                },
                success: (kronoosData) => {
                    controller.call("kronoos::parse", name, document, kronoosData, cbuscaData);
                }
            }))));
    });

    var smartBackground = function() {
        return setInterval(function() {
            if (!photos.length) {
                return;
            }
            SEARCH_BAR.css("background-image", `url(${photos[Math.floor(Math.random() * photos.length)]})`);
        }, 15000);
    };

    controller.registerCall("kronoos::smartBackground", (cbuscaData) => {
        photosQueue = async.queue(function(picture, callback) {
            if (picture.width < SEARCH_BAR.width() || picture.height < SEARCH_BAR.height()) {
                callback();
                return;
            }

            let img = new Image();
            img.onload = function() {
                callback();
                if (this.width >= SEARCH_BAR.width() && this.height >= SEARCH_BAR.height()) {
                    photos.push(picture.photo_file_url);
                }
            };
            img.src = picture.photo_file_url;
        }, 2);

        mapQueue = async.queue(function(task, callback) {
            var lat, lng;
            $.getJSON({
                url: 'https://maps.googleapis.com/maps/api/geocode/json',
                data: {
                    sensor: false,
                    address: `CEP ${task}, Brazil`
                },
                success: (data, textStatus) => {
                    if (textStatus !== "success" || !data.results.length) {
                        return;
                    }
                    lat = data.results[0].geometry.location.lat;
                    lng = data.results[0].geometry.location.lng;
                },
                complete: () => {
                    if (!lat || !lng) {
                        callback();
                        return;
                    }

                    $.ajax("//www.panoramio.com/map/get_panoramas.php", {
                        method: "GET",
                        dataType: "jsonp",
                        data: {
                            "set": "full",
                            "from": "0",
                            "to": "10",
                            "minx": lng + (-200 / (R_EARTH * Math.cos(Math.PI * lat / 180))) * (180 / Math.PI),
                            "miny": lat + (-200 / R_EARTH) * (180 / Math.PI),
                            "maxx": lng + (200 / (R_EARTH * Math.cos(Math.PI * lat / 180))) * (180 / Math.PI),
                            "maxy": lat + (200 / R_EARTH) * (180 / Math.PI),
                            "size": "original",
                            "mapfilter": "true"
                        },
                        success: (ret) => {
                            for (let picture of ret.photos.slice(0, 10)) {
                                photosQueue.push(picture);
                                if (!registered) {
                                    registered = smartBackground();
                                }
                            }

                        },
                        complete: () => {
                            callback();
                        }
                    });
                }
            });
        }, 2);

        mapQueue.drain = () => {
            if (!photos.length) {
                SEARCH_BAR.css("background-image", `url(${BACKGROUND_IMAGES.calculator})`);
            }
        };

        var runnedAddresses = [];
        $($("endereco cep", cbuscaData).get().reverse()).each((idx, element) => {
            let cep = $(element).text().replace(NON_NUMBER, '');
            if (/^\s*$/.test(cep) || runnedAddresses.indexOf(cep) != -1) {
                return;
            }

            runnedAddresses.push(cep);
            mapQueue.push(cep);
        });
    });

    controller.registerTrigger("authentication::authenticated", "kronoos::autosearch", (i, cb) => {
        cb();
        if (controller.query.k) {
            INPUT.val((CPF.isValid(controller.query.k) ? CPF : CNPJ).format(controller.query.k));
            KRONOOS_ACTION.submit();
        }
    });

    controller.registerCall("kronoos::parsers", () => parsers);

    let mapElement = null;
    controller.registerTrigger("kronoos::end", "showmap", (data, callback) => {
        callback();
        let positions = _.map(_.filter(_.flatten(_.map(parsers, x => x.geocodes)), x => x.results && x.results.length), x => x.results[0].geometry.location);
        if (!positions.length) return;

        let kronoosMap = new KronoosMap();
        if (mapElement) {
            mapElement.remove();
        }
        mapElement = $("<div />").addClass("map").css({
            height: '400px',
            width: '100%'
        });

        if (brief && brief.element) mapElement.insertAfter(brief.element);
        else mapElement.prependTo($(".kronoos-result"));

        kronoosMap.generateMap(mapElement, positions, (google, map) => {
            for (let parser of parsers) {
                for (let geolocation of parser.geocodes) {
                    if (!geolocation.results || !geolocation.results.length) continue;
                    let marker = new google.maps.Marker({
                        position: geolocation.results[0].geometry.location,
                        map: map,
                        title: `${parser.name} / ${parser.cpf_cnpj}`
                    });
                    marker.addListener('click', () => $('html, body').scrollTop(parser.appendElement.offset().top));
                }
            }
        });
    });

    controller.registerTrigger("serverCommunication::websocket::email", (opts, cb) => {
        cb();
        /* aqui vamos receber os PDF's do TJSP */
    });

};

// https://www.youtube.com/watch?v=icgGyR3iusU
