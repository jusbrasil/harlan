import humanInterval from 'human-interval';
import arrayToSentence from 'array-to-sentence';
import execall from 'execall';
import capitalize from 'capitalize';
import XlsxPopulate from 'xlsx-populate';
import { htmlEncode } from 'js-htmlencode';
import { CNPJ, CPF } from 'cpf_cnpj';
import { CognitiveDossier } from './cognitive-dossier';
import async from 'async';
import _ from 'underscore';
import pad from 'pad';
import bankCodes from './bank-codes';
import VMasker from 'vanilla-masker';
import uniqid from 'uniqid';
import saveAs from 'save-as';
import toMarkdown from 'to-markdown';
import html2canvas from 'html2canvas';
import metaphone from 'metaphone';
import cnjCourtsMap from './cnj-map';
import trf1List from './trf1-list';

const NOT_FOUND_BEGIN_TEXT = {
    juridic: 'Resultados do Poder Judiciário: ',
    adm: 'Resultados em entidades administrativas: ',
    credit: 'Resultados em bureaus de crédito: ',
    others: 'Resultados de natureza fiscal e política: ',
};

const DATABASE_REGEX = /FROM\s+\'([^\']+)\'/;

const TJRJ_COMARCA = [
    '\'COMARCA\' = \'201\'', '\'COMARCA\' = \'204\'', '\'COMARCA\' = \'209\'', '\'COMARCA\' = \'205\'', '\'COMARCA\' = \'207\'', '\'COMARCA\' = \'203\'', '\'COMARCA\' = \'210\'', '\'COMARCA\' = \'202\'', '\'COMARCA\' = \'208\'', '\'COMARCA\' = \'211\'', '\'COMARCA\' = \'206\'', '\'COMARCA\' = \'401\'', '\'COMARCA\' = \'424\'', '\'COMARCA\' = \'341\'', '\'COMARCA\' = \'403\'', '\'COMARCA\' = \'402\'', '\'COMARCA\' = \'428\'', '\'COMARCA\' = \'302\'', '\'COMARCA\' = \'432\'',
    '\'COMARCA\' = \'348\'', '\'COMARCA\' = \'404\'', '\'COMARCA\' = \'304\'', '\'COMARCA\' = \'305\'', '\'COMARCA\' = \'220\'', '\'COMARCA\' = \'306\'', '\'COMARCA\' = \'355\'', '\'COMARCA\' = \'307\'', '\'COMARCA\' = \'308\'', '\'COMARCA\' = \'309\'', '\'COMARCA\' = \'310\'', '\'COMARCA\' = \'311\'', '\'COMARCA\' = \'221\'', '\'COMARCA\' = \'312\'', '\'COMARCA\' = \'471\'', '\'COMARCA\' = \'343\'', '\'COMARCA\' = \'407\'', '\'COMARCA\' = \'408\'', '\'COMARCA\' = \'349\'', '\'COMARCA\' = \'313\'',
    '\'COMARCA\' = \'409\'', '\'COMARCA\' = \'354\'', '\'COMARCA\' = \'350\'', '\'COMARCA\' = \'314\'', '\'COMARCA\' = \'411\'', '\'COMARCA\' = \'410\'', '\'COMARCA\' = \'470\'', '\'COMARCA\' = \'315\'', '\'COMARCA\' = \'430\'', '\'COMARCA\' = \'317\'', '\'COMARCA\' = \'439\'', '\'COMARCA\' = \'318\'', '\'COMARCA\' = \'319\'', '\'COMARCA\' = \'320\'', '\'COMARCA\' = \'412\'', '\'COMARCA\' = \'222\'', '\'COMARCA\' = \'473\'', '\'COMARCA\' = \'414\'', '\'COMARCA\' = \'223\'', '\'COMARCA\' = \'321\'',
    '\'COMARCA\' = \'433\'', '\'COMARCA\' = \'323\'', '\'COMARCA\' = \'346\'', '\'COMARCA\' = \'224\'', '\'COMARCA\' = \'472\'', '\'COMARCA\' = \'353\'', '\'COMARCA\' = \'324\'', '\'COMARCA\' = \'325\'', '\'COMARCA\' = \'345\'', '\'COMARCA\' = \'434\'', '\'COMARCA\' = \'417\'', '\'COMARCA\' = \'431\'', '\'COMARCA\' = \'327\'', '\'COMARCA\' = \'328\'', '\'COMARCA\' = \'342\'', '\'COMARCA\' = \'329\'', '\'COMARCA\' = \'425\'', '\'COMARCA\' = \'435\'', '\'COMARCA\' = \'344\'', '\'COMARCA\' = \'225\'',
    '\'COMARCA\' = \'474\'', '\'COMARCA\' = \'426\'', '\'COMARCA\' = \'226\'', '\'COMARCA\' = \'351\'', '\'COMARCA\' = \'427\'', '\'COMARCA\' = \'334\'', '\'COMARCA\' = \'335\'', '\'COMARCA\' = \'429\'', '\'COMARCA\' = \'352\'', '\'COMARCA\' = \'337\'', '\'COMARCA\' = \'338\'', '\'COMARCA\' = \'420\'', '\'COMARCA\' = \'339\'', '\'COMARCA\' = \'421\'', '\'COMARCA\' = \'422\'', '\'COMARCA\' = \'436\'', '\'COMARCA\' = \'227\''
];
const MPT_STATES = require('./mpt-states');
const BAD_NAMES = ['amorim', 'silva', 'santos', 'goncalves', 'spagni', 'cancado', 'carioca'];
const BAD_ADP = ['das', 'do', 'de', 'dos', 'di', 'da'];
const CNJ_REGEX_TPL = '(\\s|^|-)(\\d+\\-?\\d{2}.?\\d{4}\\.?\\d{1}\\.?\\d{2}\\.?\\d{4})(\\s|$)';
const NON_NUMBER = /[^\d]/g;
const NAMESPACE_DESCRIPTION = {
    peps: ['Pessoa Políticamente Exposta', 'Art. 52 da Convenção das Nações Unidas contra a Corrupção'],
    congressmen: ['Deputado Federal', 'Representante eleito para a Câmara dos Deputados'],
    state_representatives: ['Deputado Estadual', 'Representante eleito para a Assembleia Legislativa Estadual'],
    corruption_scandals: ['Escândalo de Corrupção', 'Fatos políticos marcantes chamados de escândalos'],
    slave_work: ['Trabalho Escravo', 'Lista de Trabalho Escravo'],
    green_peace: ['Apontamento Greenpeace', 'Organização não governamental de preservação do meio ambiente'],
    ibama: ['Apontamento Ibama', 'Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis'],
    gas_station: ['Postos de Gasolina Cassados', 'Estão sujeitos à fiscalização postos de combustíveis, distribuidoras e transportadoras'],
    interpol: ['Interpol', 'A Organização Internacional de Polícia Criminal'],
    ceaf: ['Cadastro de Expulsões da Administração Federal', 'Banco de informações mantido pela Controladoria-Geral da União'],
    ceispj: ['Pessoa Jurídica listada no Cadastro listada no Cadastro Nacional de Empresas Inidôneas e Suspensas', 'Banco de informações mantido pela Controladoria-Geral da União'],
    ceispf: ['Pessoas Físicas listadas no Cadastro listada no Cadastro Nacional de Empresas Inidôneas e Suspensas', 'Banco de informações mantido pela Controladoria-Geral da União'],
    bovespa: ['Apontamento em Empresa de Capital Aberto - Bovespa', 'Cargos em empresas e/ou participações em assembleias.'],
    clear: ['Resultados do Dossiê Kronoos', 'Visualização dos apontamentos'],
    licitacoes: ['Participação em Licitações', 'Constam participações em licitações.'],
    hsbc: ['Fortunas e Offshores Ligadas a Brasileiros no HSBC da Suiça', 'Brasileiros com contas sigilosas na filial suíça do banco HSBC, por meio das "offshores"'],

    /* OrigemComprador, Participante, Status, data, Tipo da Licitações */
    terrorismo: ['Enquadrados na Lei-antiterrorismo', 'Pessoas enquadradas na lei-antiterrorismo.'],
};

const removeDiacritics = require('diacritics').remove;
const highPriority = 0;
const normalPriority = 100;
const lowPriority = 200;
const searchBar = $('.kronoos-application .search-bar');

let juristekInfo = null; /* Juristek INFO.INFO */

function f(document) {
    let formatted_document = pad(document.length > 11 ? 14 : 11, document, '0');
    if (!CPF.isValid(formatted_document) && !CNPJ.isValid(formatted_document)) return document;
    return (CPF.isValid(formatted_document) ? CPF : CNPJ).format(formatted_document);
}

export default class KronoosParse {

    constructor(controller, depth, name, cpf_cnpj, kronoosData,
        ccbuscaData = null, defaultType = 'maximized', parameters = {}, brief = null) {
        this.stats = brief;
        this.depth = depth;
        this.networkData = null;
        this.uniqid = uniqid();
        this.parameters = parameters;
        this.name = name.replace(/(\r)?\n/g, ' ').replace(/\s+/g, ' ');
        this.otherNames = [this.name];
        this.controller = controller;
        this.kelements = [];
        this.procElements = {};
        this.cpf_cnpjs = {};
        this.xhr = [];
        this.homonymous = 100;
        this.kronoosData = kronoosData;
        this.ccbuscaData = ccbuscaData;
        this.runningXhr = 0;
        this.titleCanChange = false;
        this.geocodes = [];
        this.resourceUse = 0;
        this.responses = [];
        this.runOnEnd = [];

        this.confirmQueue = async.queue((task, callback) => {
            task(callback);
        });

        if (CPF.isValid(cpf_cnpj)) {
            this.cpf = this.cpf_cnpj = CPF.format(cpf_cnpj);
        } else if (CNPJ.isValid(cpf_cnpj)) {
            this.cnpj = this.cpf_cnpj = CNPJ.format(cpf_cnpj);
        } else {
            throw 'Verifique se no sistema é possível chegar um CPF / CNPJ inválido';
        }

        this.appendElement = $('<div />').addClass('record');
        this.generateHeader(defaultType);

        $('.kronoos-result').append(this.appendElement);

        let execute = () => {
            if (kronoosData) this.parseKronoos(kronoosData);
            this.emptyChecker();
            let m = moment();
            this.firstElement().header(this.cpf_cnpj, name, m.format('DD/MM/YYYY'), m.format('H:mm:ss'));
            this.searchAll();
        };

        if (this.cpf) {
            this.serverCall('SELECT FROM \'CBUSCA\'.\'HOMONYMOUS\'',
                this.loader('fa-eye', `Verificando a quantidade de homônimos para o nome ${this.name}.`, {
                    dataType: 'json',
                    data: {
                        nome: this.name
                    },
                    timeout: humanInterval('45 seconds'),
                    success: ret => {
                        this.homonymous = ret.homonymous;
                        execute();
                    },
                    error: () => execute(),
                }));
        } else {
            this.homonymous = 1;
            execute();
        }
    }

    get brief() {
        if (!this._brief)[this._brief, this._briefElement] = this.stats().create(this.name, this.cpf_cnpj,
            () => $('html, body').scrollTop(this.appendElement.offset().top));
        return this._brief;
    }

    openReceipt(htmlNode) {
        let printWindow = window.open('about:blank', '_blank');
        if (!printWindow) return;
        printWindow.document.write($(htmlNode).text());
        printWindow.focus();
    }

    openReceipts(xml) {
        let items = $('BPQL > header > source[type=\'text/html\']', xml);

        if (items.length === 0) {
            this.alert({
                title: 'Não existem recibos para serem exibidos.',
                subtitle: 'Talvez essa seja uma operação que não emita recibo, verifique se existe um código de comprovante no corpo do resultado.',
                paragraph: 'Algumas consultas não apresentam comprovante na forma de recibo HTML (HyperText Markup Language), entre em contato com o suporte para maiores informações.'
            });
            return;
        }

        if (items.lenght == 1) {
            this.openReceipt(items);
            return;
        }

        let modal = this.call('modal');
        modal.title('Abrir Recibo de Consulta');
        modal.subtitle('Existe mais de um arquivo comprovante para o resultado informado.');
        modal.paragraph('Clique sobre o resultado para abrir o comprovante em uma nova janela.');
        let list = modal.createForm().createList();
        items.each((i, htmlNode) => list.item('fa-file-o', `Abrir comprovante Nº ${i+1}`).click(e => {
            e.preventDefault();
            this.openReceipt(htmlNode);

        }));
        modal.createActions().cancel();
    }

    findOtherNames(onComplete) {
        let metaname = metaphone(this.name);
        let ceps = _.uniq($('cep', this.ccbuscaData)
            .map((i, e) => $(e).text())
            .toArray()
            .filter(e => /^[\d]{5}(-)?[\d]{3}$/.test(e)));

        if (!ceps.length) {
            onComplete(this.otherNames);
            return;
        }

        async.eachLimit(ceps, 2, (cep, callback) => this.serverCall('SELECT FROM \'CORREIOS\'.\'CONSULTA\'',
            this.loader('fa-map-marker', `Verificando o CEP ${cep} em busca de diferentes grafias para o nome ${this.name}.`, {
                data: {
                    cep
                },
                success: data => {
                    if (!$('logradouro', data).length) {
                        callback();
                        return;
                    }
                    this.serverCall('SELECT FROM \'CBUSCA\'.\'FILTRO\'',
                        this.loader('fa-puzzle-piece', `Verificando o CEP ${cep} em busca de diferentes grafias para o nome ${this.name}.`, {
                            method: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                equalCep: cep,
                                equalPrimeiroNome: this.name.split(' ')[0]
                            }),
                            success: data => {
                                for (let result of data) {
                                    if (metaname !== metaphone(result.values.nome)) return;
                                    if (this.otherNames.includes(result.values.nome)) return;
                                    this.otherNames.push(result.values.nome);
                                }
                            },
                            complete: () => callback()
                        }));
                }
            })), () => onComplete(this.otherNames));
    }

    call(...args) {
        return this.controller.call(...args);
    }

    isRunning() {
        return this.runningXhr > 0;
    }

    serverCall(query, conf, priority = null) {
        if (!conf.method) conf.method = 'GET';
        if (this.finishTimeout) clearTimeout(this.finishTimeout);
        if (!(this.runningXhr++))
            this.header.element.addClass('loading');

        let complete = conf.complete;
        let success = conf.success;
        let error = conf.bipbopError;

        conf.timeout = conf.timeout || humanInterval('1 minute'); /* 1 minute */

        let resourceUseAnalytics = (xml, hasError) => {

            this.responses.push({
                query,
                data: conf.data,
                response: xml,
                hasError
            });

            if (!xml || !(xml instanceof XMLDocument)) return;
            /* fun things */
            let resourceUse = parseInt($('BPQL > header', xml).attr('resourceUse'));
            if (isNaN(resourceUse)) return;
            this.resourceUse += resourceUse;
            window.resourceUse = window.resourceUse || 0;
            window.resourceUse += resourceUse;
            if (resourceUse > 0) {
                window.expensiveQuery = window.expensiveQuery || [];
                window.expensiveQuery.push([query, conf]);
            }
        };

        conf.bipbopError = (...args) => {
            try {
                let [, , , , xml] = args;
                resourceUseAnalytics(xml, true);
                if (error) error(...args);
            } catch (e) {
                console.error(e);
                toastr.error(e);
            }
        };

        conf.success = (...args) => {
            try {
                resourceUseAnalytics(args[0], false);
                if (success) success(...args);
            } catch (e) {
                console.error(e);
                toastr.error(e);
            }
        };

        conf.complete = (...args) => {
            if (!(--this.runningXhr)) {
                this.header.element.removeClass('loading');
                if (this.finishTimeout) clearTimeout(this.finishTimeout);
                this.finishTimeout = setTimeout(() => this.end(), 1000);
            }
            if (complete) complete(...args);
        };

        this.controller.call('kronoos::ajax::queue', {
            parser: this,
            call: [query, conf]
        }, priority || normalPriority);

    }

    loader(...args) {
        return this.call('kronoos::status::ajax', ...args);
    }

    errorHappen(group, groupMessage, errorMessage = null, errorLimit = 3) {

        if (!groupMessage) {
            groupMessage = group;
        }

        if (!errorMessage) {
            errorLimit = 1;
            errorMessage = groupMessage;
        }

        if (!this._errorHappendList) {
            this._errorHappendObject = {
                paragraph: 'Os erros de captura podem ocorrer no caso de indisponibilidade do servidor e ou mudança na disposição dos dados. Para maiores informações contate nosso suporte técnico.',
            };
            this._errorHappendList = this.firstElement().list('<i class=\'fa fa-exclamation-triangle\' /> Ocorreram Erros na Captura', this._errorHappendObject, null, 10);
            this._errorHappendObject.container.addClass('kronoos-error-happen');

            this._errorHappendGroupElement = {};
            this._errorHappendErrorElements = {};
        }

        const errorMessageObject = {};

        if (this._errorHappendGroupElement[group] ||
            this._errorHappendErrorElements[group] &&
            this._errorHappendErrorElements[group].length > errorLimit) {

            if (!this._errorHappendGroupElement[group]) {
                this._errorHappendList(groupMessage, errorMessageObject);
                this._errorHappendGroupElement[group] = errorMessageObject;
            }

            if (!this._errorHappendErrorElements[group]) return;
            this._errorHappendErrorElements[group].map(element => element.remove());
            delete this._errorHappendErrorElements[group];
            return;
        }

        this._errorHappendList(errorMessage, errorMessageObject);
        this._errorHappendErrorElements[group] = this._errorHappendErrorElements[group] || [];
        this._errorHappendErrorElements[group].push(errorMessageObject.element);

    }

    notFound(element, group, ...args) {
        if (!this._notFoundList) {
            this._notFoundObject = {};
            this._notFoundList = this.firstElement().list('Não Constam Apontamentos', this._notFoundObject, null, 10);
            this._notFoundObject.container.addClass('kronoos-not-found');
            this._notFoundRows = {};
            this._notFoundItems = [];
        }

        if (this._notFoundRows[group]) this._notFoundRows[group].remove();
        this._notFoundItems[group] = this._notFoundItems[group] || [];
        this._notFoundItems[group].push(element);
        let data = args[0] || {};

        let message = arrayToSentence(this._notFoundItems[group], {lastSeparator: ' e '});
        if (NOT_FOUND_BEGIN_TEXT[group]) {
            message = `${NOT_FOUND_BEGIN_TEXT[group]} ${message}`;
        }

        let ret = this._notFoundList(message, data, ...args);
        this._notFoundRows[group] = data.element;
        ret.remove = () => {
            this._notFoundRows[group].remove();
            this._notFoundItems[group].filter(x => x !== element);
            this._notFoundList(arrayToSentence(this._notFoundItems[group], {lastSeparator: ' e '}), data, ...args);
            this._notFoundRows[group] = data.element;
        };
        return ret;
    }

    notFoundAdm(e, ...args) {
        return this.notFound(e, 'adm', ...args);
    }

    notFoundCredito(e, ...args) {
        return this.notFound(e, 'credit', ...args);
    }

    notFoundJuridic(e, ...args) {
        return this.notFound(e, 'juridic', ...args);
    }

    notFoundOthers(e, ...args) {
        return this.notFound(e, 'others', ...args);
    }

    searchDtec() {
        this.serverCall('SELECT FROM \'DTEC\'.\'SEARCH\'', {
            dataType: 'json',
            data: {documento: this.cpf_cnpj},
            success: data => {
                if (data.length !== 0) {
                    for (let appointMent of data.result) {
                        let kelement = this.kronoosElement(null, 'Presença do target nas mídias', `Notícias que contém o target pesquisado ${this.cpf_cnpj}`, appointMent.titulo);
                        kelement.table('Data da Notícia', 'Fonte da Notícia', 'Link da Notícia')(appointMent.dataNoticia || 'Não há', appointMent.fonteNoticia || 'Não há', $('<a />').text('Clique para acessar a fonte').attr({target: '_blank', href: appointMent.linkNoticia}) || 'Não há');
                        kelement.paragraph(appointMent.citacao);
                        kelement.behaviourAccurate(true);
                        this.append(kelement.element());
                    }
                }
            }
        });
    }

    searchCertidaoPDF(arr) {

        let defaultList = [
            ['trf3', 'SELECT FROM \'CERTIDOES\'.\'TRF03\'', 'TRF03', 'Tribunal Regional Federal 3º Região', null],
            ['trf3-ms', 'SELECT FROM \'CERTIDOES\'.\'TRF03\' WHERE \'ABRANGENCIA\' = \'3\'', 'TRF03', 'Justiça Federal de Primeiro Grau em Mato Grosso do Sul', null],
            ['trf3-sp', 'SELECT FROM \'CERTIDOES\'.\'TRF03\' WHERE \'ABRANGENCIA\' = \'2\'', 'TRF03', 'Justiça Federal de Primeiro Grau em São Paulo ', null],
            ['trt15', 'SELECT FROM \'CERTIDOES\'.\'TRT15\'', 'TRT15', 'Tribunal Regional do Trabalho da 15º Região ', str => !/não\s+existe\s+ação/i.test(str)],
            ['trt02', 'SELECT FROM \'CERTIDOES\'.\'TRT02\'', 'TRT02', 'Tribunal Regional do Trabalho da 2º Região', str => !/NÃO CONSTA/i.test(str)]
        ];

        if (this.cnpj) {
            defaultList.push(['trt03', 'SELECT FROM \'CERTIDOES\'.\'CONSULTATRT03\'', 'TRT03', 'Tribunal Regional do Trabalho da 3º Região', str => !/CERTID[ãÃA]O\s+NEGATIVA/i.test(str)]);
        }

        async.each(arr || defaultList, (data, cb) => {
            let [fname, query, , database, test] = data;
            if (!test) {
                test = str => /,\s*CONSTA,/i.test(str);
            }
            this.serverCall(query, this.loader('fa-balance-scale', `Capturando certidões no ${database} - ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf_cnpj,
                    nome: this.name
                },
                bipbopError: (type, message, code, push) => {
                    if (!push) {
                        this.errorHappenQuery(query, `Indisponibilidade de conexão com a fonte de dados para a certidão - ${database}`, 'não foi possível emitir a certidão no momento');
                        return;
                    }

                },
                complete: () => cb(),
                success: data => {
                    var str = $('body > text', data).text();
                    if (!test(str)) {
                        this.notFoundJuridic(database);
                        return;
                    }

                    let kelement = this.kronoosElement(null, `Certidão do ${database}`,
                        `Certidão do ${database}`, `Visualização da Certidão no ${database}`);

                    kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                        href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                        target: '_blank',
                        download: `certidao-${fname}-${this.cpf_cnpj.replace(NON_NUMBER, '')}.pdf`
                    }).append($('<img />').addClass('certidao').attr({
                        src: `data:image/png;base64,${$('body > png', data).text()}`
                    })));

                    execall(/\d{7}(\-)?\d{2}(\.)?\d{4}(\.)?\d(\.)?\d{2}(\.)?\d{4}/g, str).map(r => {
                        let proc = r.match;
                        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'', this.loader('fa-balance-scale', `Verificando processo ${r.match} para documento ${this.cpf_cnpj}`, {
                            data: {
                                data: `SELECT FROM 'CNJ'.'PROCESSO' WHERE 'PROCESSO' = '${r.match}'`
                            },
                            success: data => this.juristekCNJ(data, null, true, false, false),
                            error: data => this.errorHappen(`Indisponibilidade de conexão com a fonte de dados - ${database} - processo ${r.match}.`)
                        }));
                    });

                    kelement.behaviourAccurate(true);
                    this.append(kelement.element());
                }
            }));

        }, () => {});
    }

    searchMPT() {
        let found = false;
        this.mptSync = async.each(_.range(1, 24), (n, callback) => {
            this.serverCall('SELECT FROM \'MPT\'.\'CONSULTA\'', this.loader('fa-legal', `Capturando dados do Ministério Público do Trabalho ${n}º região - ${MPT_STATES[n]}, para o nome ${this.name}.`, {
                dataType: 'json',
                data: {
                    data: this.name,
                    n
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen(`Indisponibilidade de conexão com a fonte de dados - Ministério Público do Trabalho, ${n}º região - ${MPT_STATES[n]}`),
                success: data => {
                    let procs = data.aaData.filter(x => this.compareNames(x[0]));
                    if (!procs.length) return;
                    found = true;
                    let kelement = this.kronoosElement(null, `Ministério Público do Trabalho, ${n}º região - ${MPT_STATES[n]}`,
                        `Investigado pelo Ministério Público do Trabalho, ${n}º região - ${MPT_STATES[n]}`, null);

                    let table = kelement.table('Processo', 'Data', 'Situação');
                    for (let row of procs) {
                        let [investigado, proc, date, status] = row;
                        let procData = JSON.parse(proc);
                        table($('<a/>').attr({
                            href: `http://www.prt${n}.mpt.mp.br/index.php?option=com_mpt&view=procedimentos&extras=${procData.cipher}`,
                            target: '_blank',
                            title: `Processo ${procData.proNumero}`
                        }).text(procData.proNumero), date, status);
                    }

                    kelement[this.homonymous > 1 ? 'behaviourHomonym' :
                        'behaviourAccurate'](true);
                    this.append(kelement.element());
                },
                complete: () => callback()
            }), err => {
                if (!found)
                    this.notFoundOthers('Ministério Público do Trabalho');
            });
        });
    }

    searchSerasa() {
        this.serverCall('SELECT FROM \'PROTESTOS\'.\'REFIN\'', this.loader('fa-bank', `Acessando Serasa para a o documento ${this.cpf_cnpj}.`, {
            dataType: 'json',
            data: {
                documento: this.cpf_cnpj.replace(/[^0-9]/g, '')
            },
            bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Serasa (REFIN/PEFIN)'),
            success: data => {
                if (!data.spc) {
                    toastr.warning('A consulta ao Serasa/SPC não está habilitada.', 'Entre em contato ou tente novamente mais tarde.');
                    return;
                }
                for (let spc of data.spc) {
                    let kelement = this.kronoosElement(null, 'Consulta ao SPC/Serasa',
                        'Apontamentos e Restrições Financeiras e Comerciais',
                        'Pendências e restrições financeiras nos bureaus de crédito Serasa e SPC');
                    kelement.captionTable('Anotação Negativa', 'Associado', 'Valor')(spc.NomeAssociado, spc.Valor);
                    kelement.table('Data da Inclusão', 'Data do Vencimento')(spc.DataDeInclusao, spc.DataDoVencimento);
                    kelement.table('Entidade', 'Número do Contrato', 'Comprador, Fiador ou Avalista')(spc.Entidade, spc.NumeroContrato, spc.CompradorFiadorAvalista);
                    kelement.table('Telefone Associado', 'Cidade Associado', 'UF Associado')(spc.TelefoneAssociado, spc.CidadeAssociado, spc.UfAssociado);
                    kelement.behaviourAccurate(true);
                    this.append(kelement.element());
                }

                if (data.consultaRealizada.length) {
                    let kelement = this.kronoosElement(null, 'Consulta Realizada por Associado do SPC/Serasa',
                        'Consulta Realizada por Associado do SPC/Serasa',
                        'Um associado do SPC/Serasa consultou este CNPJ/CPF a procura de apontamentos e restrições financeiras e comerciais');

                    for (let consultaRealizada of data.consultaRealizada) {
                        kelement.captionTable('Consulta Realizada', 'Nome Associado', 'CPF/CNPJ')(consultaRealizada.NomeAssociado, consultaRealizada.CpfCnpj);
                        kelement.table('Data da Consulta', 'Cidade Associado', 'UF Associado')(consultaRealizada.DataDaConsulta, consultaRealizada.CidadeAssociado, consultaRealizada.UfAssociado);
                    }

                    this.append(kelement.element());
                }
            }
        }));
    }

    static getDatabase(query) {
        return DATABASE_REGEX.exec(query)[1];
    }

    errorHappenQuery(query, errorMessage, alternative = 'tente novamente mais tarde', groupMessage = null, limit = 4) {
        const database = KronoosParse.getDatabase(query);
        groupMessage = groupMessage || 'Indisponibilidade de conexão com a fonte de dados - [db], [alternative].'
            .replace('[db]', database)
            .replace('[alternative]', alternative);
        return this.errorHappen(database, groupMessage, errorMessage, limit);
    }

    tribunalSearch(n, callback) {
        let [query, uniq, description, notFound, name] = n;
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'', this.loader('fa-balance-scale', description, {
            data: {
                data: query
            },
            complete: () => callback(),
            bipbopError: (type, message, code, push, xml) => {
                if (push) {
                    return;
                }
                if (name) {
                    this.errorHappenQuery(query, `Indisponibilidade de conexão com a fonte de dados - ${name}, utilizando Diário Oficial como alternativa.`, 'utilizando Diário Oficial como alternativa');
                }
            },
            success: data => {
                if ($('body > processo', data).length) {
                    this.juristekCNJ(data, null, true, !uniq, !uniq);
                    return;
                }

                let procs = $('processo', data);
                if (!procs.length) {
                    return;
                }

                procs.each((i, node) => this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'', this.loader('fa-balance-scale', `Capturando dados do processo ${VMasker.toPattern($('numero_processo', node).first().text(), '9999999-99.9999.9.99.9999')} para ${this.name}`, {
                    data: {
                        data: `SELECT FROM '${$('tribunal_nome', node).text()}'.'${$('tribunal_consulta', node).text()}' WHERE ${$('parametro', node)
                            .map((i,n) => `'${$(n).attr('name')}' = '${$(n).text()}'`).toArray().join(' AND ')}`
                    },
                    success: data => this.juristekCNJ(data, null, true, !uniq, !uniq)

                })));
            }
        }), lowPriority);
    }

    searchTribunais() {
        let trf1Search = _.pairs(trf1List).map(x => [`SELECT FROM 'TRF01'.'DOCUMENTO' WHERE 'SECAO' = '${x[0]}' AND 'DOCUMENTO' = '${this.cpf_cnpj.replace(/[^\d]/g, '')}'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal Federal 1º Região - ${x[1]}`, `Não foram localizados processos associados ao documento ${this.cpf_cnpj} no Tribunal Federal 1º Região - ${x[1]}`, `Tribunal Federal 1º Região - ${x[1]}`]);

        this.tribunaisSync = async.eachLimit([
            [`SELECT FROM 'TJPA'.'CONSULTAPORNOME' WHERE 'NOME_PARTE' = '${this.name}'`, false, `Pesquisando pelo nome ${this.name} no Tribunal de Justiça do Pará, em todas as comarcas`, null, 'Tribunal de Justiça do Pará, todas as comarcas'],
            [`SELECT FROM 'TJRJ'.'NOME' WHERE 'NOME_PARTE' = '${this.name}' AND 'ORIGEM' = '1'`, false, `Pesquisando pelo nome ${this.name} no Tribunal de Justiça do Rio de Janeiro, em todas as comarcas`, null, 'Tribunal de Justiça do Rio de Janeiro, todas as comarcas'],
            [`SELECT FROM 'JFPR'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj.replace(/[^\d]/g, '')}'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Paraná)`, `Não foram localizados processos associados ao documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Paraná)`, 'Tribunal Federal 4º Região (Paraná)'],
            [`SELECT FROM 'JFRS'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj.replace(/[^\d]/g, '')}'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Rio Grande do Sul)`, `Não foram localizados processos associados ao documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Rio Grande do Sul)`, 'Tribunal Federal 4º Região (Rio Grande do Sul)'],
            [`SELECT FROM 'JFSC'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj.replace(/[^\d]/g, '')}'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Santa Catarina)`, `Não foram localizados processos associados ao documento ${this.cpf_cnpj} no Tribunal Federal 4º Região (Santa Catarina)`, 'Tribunal Federal 4º Região (Santa Catarina)'],
            [`SELECT FROM 'TRF04'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj.replace(/[^\d]/g, '')}'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal Federal 4º Região`, `Não foram localizados processos associados ao documento ${this.cpf_cnpj} no Tribunal Federal 4º Região`, 'Tribunal Federal 4º Região'],
            [`SELECT FROM 'TJRS'.'PARTE' WHERE 'NOME_PARTE' = '${this.name}'`, false, `Pesquisando pelo nome ${this.name} no Tribunal de Justiça do Rio Grande do Sul`, `Não foram localizados processo pelo nome ${this.name} no Tribunal do Rio Grande do Sul`, 'Tribunal do Rio Grande do Sul'],
            [`SELECT FROM 'STJ'.'PARTE' WHERE 'NOME_PARTE' = '${this.name}'`, false, `Pesquisando pelo nome ${this.name} no Superior Tribunal de Justiça`, `Não foram localizados processo pelo nome ${this.name} no Superior Tribunal de Justiça`, 'Superior Tribunal de Justiça'],
        ].concat(trf1Search), 10, (...args) => this.tribunalSearch(...args), err => {
            let tjrjSearch = TJRJ_COMARCA.map(x => [`SELECT FROM 'TJRJ'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj}' AND ${x} AND 'ORIGEM' = '1'`, true, `Pesquisando pelo documento ${this.cpf_cnpj} no Tribunal de Justiça do Rio de Janeiro, comarca ${x.replace(/[^0-9]/g, '')}`, null, `Tribunal de Justiça do Rio de Janeiro, comarca ${x.replace(/[^0-9]/g, '')}`]);
            if (_.findIndex(_.keys(this.procElements), v => /\.8\.19.\d{4}$/.test(v)) !== -1)
                this.tribunaisSync = async.eachLimit(tjrjSearch, 10, (...args) => this.tribunalSearch(...args), err => {});
        });
    }

    searchComprot() {
        this.serverCall('SELECT FROM \'COMPROT\'.\'CONSULTA\'', this.loader('fa-legal', `Pesquisando processos administrativos perante o Ministério da Fazenda - ${this.cpf_cnpj}.`, {
            dataType: 'json',
            data: {
                documento: this.cpf_cnpj
            },
            bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Ministério da Fazenda (Processos Administrativos).'),
            success: data => {
                if (!data.totalDeProcessosEncontrados) {
                    this.notFoundAdm('Ministério da Fazenda - COMPROT');
                    return;
                }
                let kelement = this.kronoosElement(null, 'Ministério da Fazenda - COMPROT',
                    'COMPROT - Processo Administrativo perante o Ministério da Fazenda',
                    data.totalDeProcessosEncontrados > 1 ?
                        `Existem ${data.totalDeProcessosEncontrados} processos administrativos perante o COMPROT/Ministério da Fazenda.` :
                        'Existe apontamento de processo administrativo perante o COMPROT/Ministério da Fazenda.');

                let table = kelement.captionTable('Número do Processo', 'Data', 'Número do Processo');
                kelement.table('Fonte de Dados')($('<a />').text('Consultar Processo').attr({
                    target: '_blank',
                    href: 'https://comprot.fazenda.gov.br/comprotegov/site/index.html#ajax/processo-consulta.html'
                }));

                for (let processo of data.processos) {
                    table(moment(pad(8, processo.dataProtocolo.toString(), '0'), 'DDMMYYYY')
                        .format('DD/MM/YYYY'), processo.numeroProcessoEditado);
                }
                if (data.processos.length < data.totalDeProcessosEncontrados) {
                    kelement.paragraph('Para mais números de processo acesse a ferramenta de consulta do Ministério da Fazenda no endereço abaixo.');
                }

                kelement.behaviourAccurate(true);
                this.append(kelement.element());
            }
        }));
    }

    searchTJSPCertidaoPDF(tipo, pedido, data) {
        this.serverCall('SELECT FROM \'TJSP\'.\'DOWNLOAD\'',
            this.loader('fa-balance-scale', `Capturando certidões no Tribunal de Justiça de São Paulo - ${tipo} ${this.cpf_cnpj}.`, {
                data: {
                    nuPedido: pedido,
                    dtPedido: data,
                },
                success: data => {
                    let kelement = this.kronoosElement(null, 'Certidão do TJSP',
                        tipo,
                        'Visualização da Certidão no Tribunal de Justiça de São Paulo');
                    kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                        target: '_blank',
                        href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                        download: `certidao-tjsp-${tipo}-${this.cpf_cnpj.replace(NON_NUMBER, '')}.pdf`
                    }).append($('<img />').addClass('certidao')
                        .attr({
                            src: `data:image/png;base64,${$('body > png', data).text()}`
                        })));
                    kelement.behaviourAccurate(!/\NADA\s*CONSTA/i.test($('body > text', data).text()));
                    this.append(kelement.element());
                }
            }, true));
    }

    searchTJSPCertidaoFisica() {
        if (!this.cpf || !this.name) return;
        _.map(['M'], flGenero => this.serverCall('SELECT FROM \'TJSP\'.\'CERTIDAO\'',
            this.loader('fa-balance-scale', `Capturando certidões no Tribunal de Justiça de São Paulo - ${this.cpf}.`, {
                data: {
                    nuCpfFormatado: this.cpf,
                    nmPesquisa: this.name,
                    nmMae: this.mae || '',
                    dtNascimento: this.nascimento || '',
                    tpPessoa: 'F',
                    flGenero: flGenero
                },
                success: data => {
                    let element = $('body > pedido', data);
                    if (!element.length) return;
                    let kelement = this.kronoosElement(null, 'Certidão do TJSP',
                        'Cadastro de Pedido de Certidão no Tribunal de Justiça de São Paulo',
                        'Visualização do Pedido de Certidão no Tribunal de Justiça de São Paulo');
                    let captionTableElement = kelement.captionTable('Lista de Certidões', 'Tipo', 'Pedido', 'Data');
                    element.each((i, item) => {
                        let pedido = $('pedido', item).text();
                        let data = $('data', item).text();
                        let tipo = $(item).attr('type');
                        captionTableElement(tipo, pedido, data);
                        this.searchTJSPCertidaoPDF(tipo, pedido, data);
                    });
                    this.append(kelement.element());
                }
            }, true)));
    }

    cognitiveParser() {
        if (this.cognitiveDossier) return;
        let cognitiveDossier = new CognitiveDossier(this);
        this.cognitiveDossier = cognitiveDossier;
        let table = null;

        let generateTable = () => {
            let table = this.firstElement().captionTable('Relatório Cognitivo');
            table.element.addClass('cognitive-dossier');
            return table;
        };

        cognitiveDossier.generateOutput((title, score, paragraph) => {
            table = table || generateTable();
            let row = table(null, paragraph);
            let cells = $('td', row.element);
            let s = Math.ceil(score * 100);
            harlan.interface.widgets.radialProject(cells.first(), s).element.addClass(s > 60 ? 'warning' : (s > 40 ? 'attention' : 'default'));
            $('<label />').text(title).appendTo(cells.last());
            /* copy that motherfucker hahahaha */
        });
    }

    searchPepCoaf() {
        if (!this.cpf) return;
        this.serverCall('SELECT FROM \'KRONOOS\'.\'PEP\'',
            this.loader('fa-user-circle', `Comparando documento com base de dados das pessoas políticamente expostas do COAF - ${this.cpf}.`, {
                dataType: 'json',
                data: {
                    documento: this.cpf.replace(/[^0-9]/g, '')
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Pessoas Políticamente Expostas (COAF).'),
                success: data => {
                    if (!data) {
                        this.notFoundOthers('COAF (PEP)');
                        return;
                    }
                    let kelement = this.kronoosElement(null, 'Pessoa Políticamente Exposta',
                        'A pessoa consta na base de dados do COAF.',
                        'Visualização dos cargos políticos na base de dados do COAF.');
                    kelement.behaviourAccurate(true);
                    kelement.captionTable('Registros no COAF',
                        'Sigla', 'Descricão', 'Nível', 'Orgão')(
                        data.siglaFuncaoPep, data['descriçãoFuncaoPep'],
                        data.nivelFuncaoPep, data.nomeOrgaoPep);
                    kelement.table('Início', 'Fim', 'Carência')(
                        data.dtInicioExercicio, data.dtFimExercicio,
                        data.dtFinalCarencia);
                    this.append(kelement.element());
                },
                error: err => {
                    this.notFoundOthers('COAF (PEP)');
                }
            }, true));
    }

    searchPep() {
        if (!this.cpf) return;
        this.serverCall('SELECT FROM \'KRONOOS\'.\'ELEICOES\'',
            this.loader('fa-user-circle', `Comparando documento com base de dados das pessoas políticamente expostas - ${this.cpf}.`, {
                dataType: 'json',
                data: {
                    nome: `"${this.name}"`
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Pessoas Políticamente Expostas (TSE).'),
                success: data => {
                    let behaviour = 'behaviourAccurate';
                    data = _.values(data);
                    data = _.filter(data, politic => {
                        if (!politic.CPF_CANDIDATO) {
                            if (politic.DATA_NASCIMENTO && this.nascimento) {
                                let d1 = moment(politic.DATA_NASCIMENTO, 'DD/MM/YY');
                                let d2 = moment(this.nascimento, 'DD/MM/YYYY');
                                if (d1.isValid() && d2.isValid()) {
                                    return d1.isSame(d2, 'day');
                                }
                            }
                            if (this.homonymous > 10) {
                                return false;
                            }
                            behaviour = 'behaviourHomonym';
                            return true;
                        }
                        let cpfValue = this.cpf.replace(/[^\d]/g, '');
                        return politic.CPF_CANDIDATO == cpfValue;
                    });
                    if (!data.length) {
                        this.notFoundOthers('Base de dados do TSE - Candidatura a cargo político');
                        return;
                    }
                    let kelement = this.kronoosElement(null, 'Pessoa Políticamente Exposta',
                        'A pessoa física se candidatou a cargo político e consta na base de dados do TSE.',
                        'Visualização das candidaturas da pessoa física na base de dados do Tribunal Superior Eleitoral.');
                    kelement[behaviour](true);
                    let captionTableElement = kelement.captionTable('Registros no Tribunal Superior Eleitoral', 'Partido', 'Descrição do Cargo', 'Situação', 'Candidatura', 'Ano da Eleição', 'Cidade');
                    for (let row of data) {
                        captionTableElement(row.NOME_PARTIDO, row.DESCRICAO_CARGO, row.DESC_SIT_TOT_TURNO || 'Não há', row.DES_SITUACAO_CANDIDATURA, row.ANO_ELEICAO, row.DESCRICAO_UE);
                    }
                    this.append(kelement.element());
                }
            }, true));
    }

    searchCRF() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'CRF\'.\'CONSULTA\'',
            this.loader('fa-eye', `Verificando CNPJ para pagamentos do FGTS - ${this.cnpj}.`, {
                data: {documento: this.cnpj},
                success: data => {
                    this.firstElement().table('Situação do FGTS')($('<a />').text('Comprovante de Consulta').attr('href', '#').click(e => {
                        e.preventDefault();
                        this.openReceipts(data);
                    }));
                }
            }));
    }

    searchReporterBrasil() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'KRONOOSMODA\'.\'LISTA\'',
            this.loader('fa-eye', `Verificando CNPJ na lista do aplicativo Moda Livre - ${this.cnpj}.`, {
                dataType: 'json',
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Moda Livre (Trabalho Análogo ao da Escravidão).'),
                success: data => {
                    let results = _.filter(data, reg => reg.status_cor != 'verde' && new RegExp(`( |^)${reg.nome_marca}( |$)`, 'i').test(this.name));
                    if (!results.length) {
                        this.notFoundAdm('Trabalho Escravo');
                        return;
                    }
                    let result = results[0];

                    let kelement = this.kronoosElement(null, 'Uso de Trabalho Análogo ao da Escravidão',
                        'Lista da Moda Livre sobre trabalho análogo ao da escravidão.',
                        'Conta apontamento na lista do aplicativo Moda Livre de empresa que usa trabalho análogo ao da escravidão.');
                    kelement.table('Descrição')(result.descricao);
                    kelement.table('Monitoramento')(result.monitoramento);
                    kelement.table('Transparência')(result.transparencia);
                    kelement.behaviourHomonym(true);
                    this.append(kelement.element());
                }
            }, true));
    }

    searchTJSPCertidao() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'TJSP\'.\'CERTIDAO\'',
            this.loader('fa-balance-scale', `Capturando certidões no Tribunal de Justiça de São Paulo - ${this.cnpj}.`, {
                data: {
                    nuCnpjFormatado: this.cnpj,
                    nmPesquisa: this.name,
                    tpPessoa: 'J'
                },
                success: data => {
                    let element = $('body > pedido', data);
                    if (!element.length) return;
                    let kelement = this.kronoosElement(null, 'Certidão do TJSP',
                        'Cadastro de Pedido de Certidão no Tribunal de Justiça de São Paulo',
                        'Visualização do Pedido de Certidão no Tribunal de Justiça de São Paulo');
                    let captionTableElement = kelement.captionTable('Lista de Certidões', 'Tipo', 'Pedido', 'Data');
                    element.each((i, item) => {
                        let pedido = $('pedido', item).text();
                        let data = $('data', item).text();
                        let tipo = $(item).attr('type');
                        captionTableElement(tipo, pedido, data);
                        this.searchTJSPCertidaoPDF(tipo, pedido, data);
                    });
                    this.append(kelement.element());
                }
            }, true));
    }

    searchAll() {
        this.searchPepCoaf();
        this.searchCrawler();
        if (this.cnpj) this.searchCertidao();
        this.searchReporterBrasil();
        this.searchCepim();
        this.searchExpulsoes();
        this.searchCnep();
        this.searchCeis();
        this.searchBovespa();
        this.searchDtec();

        this.buy('Capturar informações jurídicas dos Tribunais de Justiça.', 0, () => this.searchJuridic());
        this.buy('Abrir informações de crédito - Cheques sem Fundo, protestos e Serasa.', 0, () => this.searchBureau());

        if (!this.ccbuscaData) {
            this.serverCall('SELECT FROM \'CCBUSCA\'.\'CONSULTA\'',
                this.loader('fa-bank', `Acessando bureau de crédito para ${this.name || ''} ${this.cpf_cnpj}.`, {
                    data: {
                        documento: this.cpf_cnpj,
                    },
                    success: ret => this.showCBusca(ret)
                }));
            return;
        }

        this.showCBusca();
        this.generateRelations = this.call('generateRelations');
        this.generateRelations.appendDocument(this.ccbuscaData, this.cpf_cnpj);
        this.cpf_cnpjs[this.cpf_cnpj] = true;
        this.graphTrack();

    }

    searchJuridic() {
        this.jusSearch();
        // this.searchTRF1();
        this.searchTjsp();
        this.searchTjspDocument();
        this.searchTjce();
        this.searchTjceDocument();
        this.searchCARFDocumento();
        this.searchCertidaoPDF();
        this.searchCRF();
        this.searchMPT();
        this.searchTribunais();
        this.searchMandados();
        this.searchCNDT();
        this.searchMTE();
        this.searchIbama();
        if (this.cnpj) this.searchTJSPCertidao();
        this.searchCNJImprobidade();
        this.runOnEnd.push(() => this.juristekInfoNotFound());
    }

    searchBureau() {
        this.searchCCF();
        this.searchProtestos();
        this.searchSerasa();
        this.searchComprot();
        this.searchDAU();
        this.searchCertidaoPDF([['pgesp', 'SELECT FROM \'CERTIDOES\'.\'PGESP\'',
            'PGESP', 'Procuradoria Geral do Estado - Dívida Ativa', null]]);
        this.runOnEnd.push(() => this.cognitiveParser());
    }

    buy(title, ammount, action) {
        if ((this.controller.query.buyAll || (Array.isArray(this.controller.confs.user.tags) && this.controller.confs.user.tags.includes('kronoos-buyall'))) && !ammount) {
            action();
            return;
        }

        if (!this.adicionalInformation) {
            this.adicionalInformation = this.firstElement().captionTable('Informações Adicionais');
            this.adicionalInformation.element.addClass('kronoos-buy');
        }

        let row = this.adicionalInformation(title, $('<button />').addClass('kronoos-buy-button').text('Abrir').click(e => {
            e.preventDefault();
            this.call('credits::has', ammount, () => {
                row.element.remove();
                action();
            });
        }));
    }

    cbuscaMae() {
        let row = {};
        let maeNode = $('nomemae', this.ccbuscaData).first();
        if (maeNode.length && maeNode.text()) {
            row['Nome da Mãe'] = maeNode.text();
            this.mae = maeNode.text();
        }

        let dtNascimento = $('dtnascimento', this.ccbuscaData);
        if (dtNascimento.length && dtNascimento.text()) {
            let dtNasc = moment(dtNascimento.text(), 'YYYYMMDD').format('DD/MM/YYYY');
            this.nascimento = dtNasc;
            if (this.cpf) this.searchCertidao(dtNasc, this.cpf);
            row[this.cpf ? 'Data de Nascimento' : 'Data de Abertura'] = dtNasc;
        }

        // if (this.cpf) this.searchTJSPCertidaoFisica();

        if (!_.keys(row).length) return;
        this.firstElement().table(..._.keys(row))(..._.values(row));
    }

    searchCrawler() {
        let query = {
            cpf_cnpj: cb => this.serverCall('SELECT FROM \'WEBSEARCH\'.\'QUERY\'', this.loader('fa-search', `Pesquisando na rede mundial pelo documento ${this.cpf_cnpj}`, {
                method: 'GET',
                dataType: 'json',
                data: {
                    data: `"${this.cpf_cnpj}"`
                },
                success: data => cb(null, data),
                error: () => cb()
            })),
        };

        if (this.cnpj || (this.homonymous <= 1 && this.name.split(' ').length >= 3)) {
            query.name = cb => this.serverCall('SELECT FROM \'WEBSEARCH\'.\'QUERY\'', this.loader('fa-search', `Pesquisando na rede mundial pelo nome ${this.name}`, {
                method: 'GET',
                dataType: 'json',
                data: {
                    data: `"${this.name}"`
                },
                success: data => cb(null, data),
                error: () => cb()
            }));
        }

        async.auto(query, (err, results) => {
            let context = _.pick(results, v => {
                if (!v) return false;
                if (!v.webPages || !v.webPages.totalEstimatedMatches) return false;
                return true;
            });

            if (!Object.keys(context).length) {
                return false;
            }

            let pages = [].concat(..._.pluck(_.pluck(context, 'webPages'), 'value'));
            let kelement = this.kronoosElement(null, 'Pesquisa na Internet',
                `Consulta a internet utilizando o nome completo ${this.name} e/ou o documento ${this.cpf_cnpj}.`,
                pages.length > 1 ?
                    `Foram localizadas ${pages.length} páginas relevantes na internet utilizando o nome completo e/ou o documento.` :
                    'Foi localizada página na internet utilizando o nome completo e/ou o documento.');

            pages.map(page => kelement.captionTable(page.name, $('<a />').text(page.displayUrl).attr({
                href: page.url,
                target: '_blank'
            }))(page.snippet));
            this.append(kelement.element());
        });

        this.serverCall('SELECT FROM \'WEBSEARCH\'.\'QUERY\'', this.loader('fa-search', `Pesquisando principais notícias para o nome ${this.name}`, {
            method: 'GET',
            dataType: 'json',
            data: {
                query: 'news',
                data: `"${this.name}"`
            },
            success: data => {}
        }));
    }

    cbuscaTelefone() {
        let telefones = $('telefones telefone', this.ccbuscaData);
        if (!telefones.length) return;
        let phones = _.uniq(telefones.map((i, e) => VMasker.toPattern($('ddd', e).text() + $('numero', e).text(), '(99) 9999-99999')).toArray());
        let klist = this.firstElement().captionTable('Telefones');
        for (let i = 0; i < phones.length; i += 3) {
            klist(phones[i], phones[i + 1], phones[i + 2]);
        }

    }

    end() {
        /* troco a referência para zerar a fila */
        let runOnEnd = this.runOnEnd;
        this.runOnEnd = [];
        /* aqui nós executamos todos os processos pendentes */
        for (let endFunction of runOnEnd) {
            endFunction();
        }
    }

    juristekInfoNotFound() {
        this.juristekInfo(info => {
            let filter = _.uniq(_.filter(_.keys(this.procElements).map(cnj => {
                let jtr = cnj.substr(-9).substr(0, 4); /* justiça e tribunal */
                let j = jtr[0]; /* justiça */
                let couldBeJTR = cnjCourtsMap[jtr] || cnjCourtsMap[j];

                if (!couldBeJTR || !Array.isArray(couldBeJTR) || !couldBeJTR.length) {
                    return null;
                }

                let tr = couldBeJTR[0];
                if (!tr) return null;
                if (typeof tr == 'object') {
                    tr = _.keys(tr)[0];
                    if (!tr) return null;
                }
                if (typeof tr !== 'string') return null;
                let database = $(`body > database[name='${tr}']`, juristekInfo);
                if (!database.length) return null;
                return database.attr('name');
            })));
            let achouTrt03 = false;
            let list = _.difference($('body > database', info).map((i, e) => {
                if (($(e).attr('name') === 'TRF03') && !achouTrt03) {
                    achouTrt03 = true;
                    return $(e).attr('name') + ' - eletrônico';
                }
                return $(e).attr('name');
            }).toArray(), filter);
            if (!list.length) return;
            this.notFoundJuridic(list.join(', '));
        });
    }

    cbuscaEmpregos() {
        let rendaEmpregador = $('rendaEmpregador rendaEmpregador', this.ccbuscaData);
        if (!rendaEmpregador.length) return;
        let klist = this.firstElement().list('Empregadores', {}, this.groupElement());
        rendaEmpregador.each((idx, value) => {
            let v = x => $(x, value).text();
            klist(`${v('empregador')} <small>${v('setorEmpregador')}</small> - ${v('cboDescricao')} <small>${v('faixaRenda')} em ${moment(v('rendaDataRef'), 'YYYY-MM-DD').format('DD/MM/YYYY')}, ${moment(v('rendaDataRef'), 'YYYY-MM-DD').fromNow()}.</small>`);
        });
    }

    groupElement() {
        if (!this.grouElements) {
            this.grouElements = this.firstElement().flexContent();
        }
        return this.grouElements;
    }

    cbuscaEnderecos() {
        let enderecos = $('enderecos endereco', this.ccbuscaData);
        if (!enderecos.length) return;
        let klist = this.firstElement().list('Endereço', {}, this.groupElement());
        let keys = {};
        enderecos.each((idx, value) => {
            let v = x => $(x, value).text();
            if (!v('cep')) return;

            let number = v('numero').replace(/^0+/, '');
            let key = v('cep') + number;
            if (keys[key]) return;
            keys[key] = true;
            klist(`${v('tipo')} ${v('logradouro')}, ${number} - ${v('complemento')} - ${v('cidade')} - ${v('estado')}, ${v('cep')}`);
            this.serverCall('SELECT FROM \'KRONOOS\'.\'GEOCODE\'',
                this.loader('fa-map', `Localizando para o documento ${this.cpf_cnpj} o endereço inscrito no CEP ${VMasker.toPattern(v('cep'), '99999-999')}.`, {
                    dataType: 'json',
                    data: {
                        address: `${v('tipo')} ${v('logradouro')}, ${number} - ${v('cidade')} - ${v('estado')}, ${v('cep')}`
                    },
                    success: geo => this.geocodes.push(geo)
                }));
        });
    }

    showCBusca(ccbuscaData = null) {
        if (ccbuscaData) this.ccbuscaData = ccbuscaData;
        this.cbuscaMae();
        this.cbuscaTelefone();
        this.cbuscaEnderecos();
        this.cbuscaEmpregos();
        this.searchPep();
        this.searchCNPJSocio();
    }

    searchCNPJSocio() {
        if (!this.ccbuscaData || !this.cpf) return;
        let total = 0;
        async.each($('parsocietaria empresa cnpj', this.ccbuscaData).map((i, e) => $(e).text()).toArray(), (cnpj, callback) => this.serverCall('SELECT FROM \'RFBCNPJANDROID\'.\'CERTIDAO\'',
            this.loader('fa-archive', `Verificando a situação do documento ${this.cpf_cnpj} junto a Receita Federal.`, {
                data: {documento: cnpj},
                success: data => total += parseInt($())
            })), () => {
            /* adiciona element*/
        });
    }

    searchBovespa() {}

    searchDAU() {
        this.serverCall('SELECT FROM \'RFBDAU\'.\'CONSULTA\'',
            this.loader('fa-money', `Pesquisando Dívida Ativa da União para o documento ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf_cnpj
                },
                bipbopError: (type, message, code, push, xml) => {
                    if (/são insuficientes para a emissão de certidão/.test(message)) {
                        let kelement = this.kronoosElement(null, 'CND Federal',
                            'Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União',
                            'Existem pendências e/ou incosistência de informações no sistema da Receita Federal para o documento informado.');
                        kelement.behaviourAccurate(true);
                        this.append(kelement.element());
                        return;
                    }
                    this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União');
                },
                success: data => {
                    let kelement = this.kronoosElement(null, 'CND Federal',
                        'Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União',
                        'Documento comprova que empresa está em condição regular em relação à Secretaria da Receita Federal e à dívida ativa da União.');

                    kelement.table('Nome', 'Documento')($('nome', data).text(), $('documento', data).text());
                    kelement.table('Validade', 'Código de Controle')($('validade', data).text(), $('codigo_de_controle', data).text());
                    let text = $('descricao', data).text();
                    kelement.paragraph(htmlEncode(text));
                    kelement.behaviourAccurate(!!/\:\s*constam/i.test(text));
                    this.append(kelement.element());
                },
            }, true));
    }

    searchCNDT() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'CNDT\'.\'CERTIDAO\'',
            this.loader('fa-legal', `Certidão Negativa de Débitos Trabalhistas ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cnpj
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados para a certidão - Certidão Negativa de Débitos Trabalhistas'),
                success: data => {
                    let kelement = this.kronoosElement(null, 'Certidão Negativa de Débitos Trabalhistas - TST',
                        'Geração de Certidão Negativa de Débitos Trabalhistas no Tribunal Superior do Trabalho',
                        'Certidão Negativa de Débitos Trabalhistas - CNDT, documento indispensável à participação em licitações públicas.');
                    kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                        target: '_blank',
                        href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                        download: `certidao-cndt-${this.cnpj.replace(NON_NUMBER, '')}.pdf`
                    }).append($('<img />').addClass('certidao')
                        .attr({
                            src: `data:image/png;base64,${$('body > png', data).text()}`
                        })));
                    kelement.behaviourAccurate(!/\N[Ãã]O CONSTA/i.test($('body > text', data).text()));
                    this.append(kelement.element());
                }
            }, true));
    }

    searchIbama() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'Ibama\'.\'CERTIDAO\'',
            this.loader('fa-tree', `Geração de Certidão Negativa de Débito do Ibama para o documento ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cnpj,
                    nome: this.name
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados para a certidão - Certidão Negativa de Débito do Ibama'),
                success: data => {
                    let kelement = this.kronoosElement(null, 'Certidão de Débito do Ibama',
                        'Geração de Certidão de Débito do Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis.',
                        'Emissão de Geração de Certidão de Débito do Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis.');

                    let msg = $('mensagem', data);
                    if (msg.length) {
                        kelement.table('Mensagem')(msg.text());
                        kelement.behaviourAccurate(true);
                    } else {
                        kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                            target: '_blank',
                            href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                            download: `certidao-ibama-${this.cnpj.replace(NON_NUMBER, '')}.pdf`
                        }).append($('<img />').addClass('certidao')
                            .attr({
                                src: `data:image/png;base64,${$('body > png', data).text()}`
                            })));
                        kelement.behaviourAccurate(!/\NADA CONSTA/i.test($('body > text', data).text()));
                    }
                    this.append(kelement.element());
                }
            }, true));
    }

    searchCNJImprobidade() {
        this.serverCall('SELECT FROM \'CNJ\'.\'IMPROBIDADE\'',
            this.loader('fa-legal', `Pesquisando no cadastro do Conselho Nacional de Justiça - CNJ ${this.cpf_cnpj}.`, {
                dataType: 'json',
                data: {
                    documento: this.cpf_cnpj
                },
                success: data => {
                    if (!data.length) {
                        this.notFoundAdm('Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa e Inelegibilidade');
                        return;
                    }
                    let kelement = this.kronoosElement(null, 'Conselho Nacional de Justiça - CNJ',
                        'Cadastro Nacional de Condenações Cíveis por Ato de Improbidade Administrativa e Inelegibilidade',
                        'Presença no cadastro nacional de condenações cíveis por ato de improbidade administrativa e inegibilidade.');

                    kelement.table('Endereço do Processo')(..._.map(data, linkAddress => $('<a />')
                        .attr({
                            target: '_blank',
                            href: linkAddress
                        }).append(`Link para Processo <small>${linkAddress}</small>`)));

                    kelement.behaviourAccurate(true);
                    this.append(kelement.element());
                }
            }, true));
    }

    searchMTE() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'MTE\'.\'CERTIDAO\'',
            this.loader('fa-legal', `Geração de Certidão de Débito e Consulta a Informações Processuais de Autos de Infração ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cnpj
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados para a certidão - Secretaria de Inspeção do Trabalho - SIT'),
                success: data => {
                    let kelement = this.kronoosElement(null, 'Secretaria de Inspeção do Trabalho - SIT',
                        'Geração de Certidão de Débito e Consulta a Informações Processuais de Autos de Infração',
                        'Emissão de Certidão de Débito, Consulta a Andamento Processual e Consulta a Informações Processuais de Autos de Infração.');

                    kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                        target: '_blank',
                        href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                        download: `certidao-mte-${this.cnpj.replace(NON_NUMBER, '')}.pdf`
                    }).append($('<img />').addClass('certidao')
                        .attr({
                            src: `data:image/png;base64,${$('body > png', data).text()}`
                        })));
                    kelement.behaviourAccurate(!/\N[Ãã]O CONSTA/i.test($('body > text', data).text()));
                    this.append(kelement.element());
                }
            }, true));
    }

    searchProtestos() {
        this.serverCall('SELECT FROM \'IEPTB\'.\'WS\'',
            this.loader('fa-money', `Buscando por ocorrências de protestos para o documento ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf_cnpj
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Instituto de Estudos de Protesto de Títulos do Brasil'),
                success: data => {
                    let iterateOver = $('BPQL > body > consulta > conteudo > cartorio', data);

                    if (!iterateOver.length) {
                        this.notFoundCredito('Protestos em Cartórios');
                        return;
                    }

                    _.each(iterateOver, element => {
                        let kelement = this.kronoosElement(null, 'Protestos em Cartórios',
                            'Detalhes a cerca de protestos realizados em cartório',
                            'Foram localizados protestos registrados em cartório.');
                        kelement.behaviourAccurate(true);

                        kelement.table('Nome do Cartório', 'Endereço')($('nome', element).text(), $('endereco', element).text());
                        kelement.table('Protestos', 'Telefone', 'Cidade')($('protestos', element).text(), $('telefone', element).text(), $('cidade', element).text());
                        this.append(kelement.element());
                    });
                },
            }, true));
    }

    searchCCF() {
        this.serverCall('SELECT FROM \'SEEKLOC\'.\'CCF\'',
            this.loader('fa-money', `Buscando por ocorrências de cheques sem fundo para o documento ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf_cnpj
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - BACEN (Cheques sem Fundo)'),
                success: data => {
                    let iterateOver = $('data resposta list > *', data);
                    if (!iterateOver.length) {
                        this.notFoundCredito('Cheques sem Fundo em Instituição Bancária');
                        return;
                    }
                    _.each(iterateOver, element => {
                        let bankName = bankCodes[$('banco', element).text()] ||
                            bankCodes[$('banco', element).text().replace(/^0+/, '')];

                        let kelement = this.kronoosElement(null, 'Cheques sem Fundo em Instituição Bancária',
                            'Detalhes acerca de cheques sem fundo emitidos',
                            'Foram localizados cheques sem fundo em uma instituição bancária.');
                        kelement.behaviourAccurate(true);

                        if (bankName) {
                            kelement.table('Código Bancário', 'Banco', 'Agência')($('banco', element).text(), bankName, $('agencia', element).text());
                        } else {
                            kelement.table('Código Bancário', 'Agência')($('banco', element).text(), $('agencia', element).text());

                        }

                        kelement.table('Qtde. Ocorrências', 'Alínea')($('qteOcorrencias', element).text(), $('motivo', element).text());

                        let v1 = moment($('dataUltOcorrencia', element).text(), 'DD/MM/YYYY');
                        let v2 = moment($('ultimo', element).text(), 'DD/MM/YYYY');
                        let e1 = v1.isAfter(v2) ? v2 : v1;
                        let e2 = v1.isAfter(v2) ? v1 : v2;

                        let table = kelement.table(`Primeiro Registro (${e1.fromNow()})`,
                            `Última Ocorrência (${e2.fromNow()})`);
                        table(e1.format('DD/MM/YYYY'), e2.format('DD/MM/YYYY'));
                        this.append(kelement.element());
                    });

                },
            }, true));

    }

    searchCnep() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'PORTALTRANSPARENCIA\'.\'CNEP\'',
            this.loader('fa-archive', `Verificando cadastro nacional de empresas punidas com o CNPJ ${this.cnpj}.`, {
                data: {
                    documento: this.cnpj
                },
                error: () => this.notFoundAdm('Cadastro Nacional de Empresas Punidas'),
                success: data => {
                    let x = n => $(n, data).text();
                    let kelement = this.kronoosElement(null, 'Cadastro Nacional de Empresas Punidas',
                        'Existência de apontamentos cadastrais.', 'Portal da transparência, cadastro nacional de empresas punidas.');
                    kelement.behaviourAccurate(true);
                    kelement.table('Tipo da sanção', 'Fundamentação legal')(x('TIPO-DA-SANCAO'), x('FUNDAMENTACAO-LEGAL'));
                    kelement.table('Descrição da fundamentação legal', 'Data de início da sanção')(x('DESCRICAO-DA-FUNDAMENTACAO-LEGAL'), x('DATA-DE-INICIO-DA-SANCAO'));
                    kelement.table('Data de fim da sanção', 'Data de publicação sanção')(x('DATA-DE-FIM-DA-SANCAO'), x('DATA-DE-PUBLICACAO-SANCAO'));
                    kelement.table('Número do processo', 'Órgão sancionador')(x('NUMERO-DO-PROCESSO'), x('ORGAO-SANCIONADOR'));
                    kelement.table('UF do órgão sancionador', 'Origem da informação')(x('UF-DO-ORGAO-SANCIONADOR'), x('ORIGEM-DA-INFORMACAO'));

                    this.append(kelement.element());
                },
            }, true));
    }

    searchExpulsoes() {
        if (!this.cpf) return;
        this.serverCall('SELECT FROM \'PORTALTRANSPARENCIA\'.\'EXPULSOES\'',
            this.loader('fa-archive', `Verificando sanções e expulsões na Controladoria Geral da União com o CPF ${this.cpf}.`, {
                data: {
                    documento: this.cpf
                },
                error: () => this.notFoundAdm('Sanções e expulsões na Controladoria Geral da União'),
                success: data => {
                    let x = n => $(n, data).text();
                    let kelement = this.kronoosElement(null, 'Sanções e Expulsões na Controladoria Geral da União',
                        'Existência de apontamentos cadastrais.', 'Sanções e expulsões na Controladoria Geral da União.');

                    kelement.behaviourAccurate(true);

                    kelement.table('Número da Portaria', 'Publicação do DOU')(x('NUMERO-DA-PORTARIA'), x('PUBLICACAO-NO-DOU'));
                    kelement.table('Número do Processo Administrativo', 'Tipo de Punição')(x('NUMERO-DO-PROCESSO-ADMINISTRATIVO'), x('TIPO-DE-PUNICAO'));
                    kelement.table('Cargo Efetivo', 'Função ou Cargo de Confiança')(x('CARGO-EFETIVO'), x('FUNCAO-OU-CARGO-DE-CONFIANCA'));
                    kelement.table('Orgão de Lotação', 'UF de Lotação')(x('ORGAO-DE-LOTACAO'), x('UF-DE-LOTACAO'));
                    kelement.table('Fundamento Legal')(x('FUNDAMENTO-LEGAL'));

                    this.append(kelement.element());
                },
            }, true));
    }

    searchCepim() {
        if (!this.cnpj) return;
        this.serverCall('SELECT FROM \'PORTALTRANSPARENCIA\'.\'CEPIM\'',
            this.loader('fa-archive', `Verificando entidades privadas sem fins lucrativas impedidas com o CNPJ ${this.cnpj}.`, {
                error: () => this.notFoundAdm('Entidades privadas sem fins lucrativas impedidas na controladoria geral da união'),
                data: {
                    documento: this.cnpj
                },
                success: data => {
                    let x = n => $(n, data).text();
                    let kelement = this.kronoosElement(null, 'ONGs impedidas na CGU',
                        'Existência de apontamentos cadastrais.', 'Entidades privadas sem fins lucrativas impedidas na controladoria geral da união.');

                    kelement.behaviourAccurate(true);
                    kelement.table('Número do Convênio Siafi', 'Situação')(x('NUMERO-DO-CONVENIO-SIAFI'), x('SITUACAO'));
                    kelement.table('Nº Original', 'Objeto do Convênio')(x('N-ORIGINAL'), x('OBJETO-DO-CONVENIO'));
                    kelement.table('Orgão Superior', 'Concedente')(x('ORGAO-SUPERIOR'), x('CONCEDENTE'));
                    kelement.table('Convenente', 'Valor Convênio')(x('CONVENENTE'), `R$ ${x('VALOR-CONVENIO')}`);
                    kelement.table('Valor Liberado', 'Publicação')(x('VALOR-LIBERADO'), x('PUBLICACAO'));
                    kelement.table('Início da Vigência', 'Fim da Vigência')(x('INICIO-DA-VIGENCIA'), x('FIM-DA-VIGENCIA'));
                    kelement.table('Valor Contrapartida', 'Data Última Liberação')(`R$ ${x('VALOR-CONTRAPARTIDA')}`, x('DATA-ULTIMA-LIBERACAO'));
                    kelement.table('valor Última Liberação')(`R$ ${x('VALOR-ULTIMA-LIBERACAO')}`);

                    this.append(kelement.element());
                },
            }, true));
    }

    searchJucespNire(nire) {
        this.serverCall('SELECT FROM \'JUCESP\'.\'DOCUMENT\'', this.loader('fa-archive', `Procurando ficha cadastral da empresa ${this.name} (NIRE: ${nire}) junto a JUCESP.`, {
            data: {
                nire
            },
            bipbopError: (type, message, code, push, xml) => !push && this.errorHappen(`Indisponibilidade de conexão com a fonte de dados - JUCESP ${nire}`),
            success: data => {
                let kelement = this.kronoosElement(null, 'Ficha Cadastral da Empresa na Jucesp',
                    'Ficha cadastral completa da empresa registrada na Jucesp desde 1992.',
                    'Consulta da ficha cadastral completa na Junta Comercial do Estado de São Paulo.');
                kelement.element().find('.kronoos-side-content').append($('<a />').attr({
                    href: `data:application/octet-stream;base64,${$('body > pdf', data).text()}`,
                    target: '_blank',
                    download: `certidao-jucesp-${nire}-${this.cpf_cnpj.replace(NON_NUMBER, '')}.pdf`
                }).append($('<img />').addClass('certidao')
                    .attr({
                        src: `data:image/png;base64,${$('body > png', data).text()}`
                    })));
                this.append(kelement.element());
            }
        }));
    }

    searchJucesp(name) {
        this.serverCall('SELECT FROM \'JUCESP\'.\'SEARCH\'', this.loader('fa-archive', `Procurando NIRE da empresa ${this.name} junto a JUCESP.`, {
            data: {
                data: name || this.name
            },
            bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - JUCESP'),
            success: data => $('node > node', data).filter((im, n) => this.compareNames($('name', n).text(), this.name)).each((im, n) => $('nire', n).each((im, n) => this.searchJucespNire($(n).text())))}));
    }

    searchCertidao(nascimento = null, cpf_cnpj = null) {
        cpf_cnpj = cpf_cnpj || this.cpf_cnpj;
        this.serverCall(CNPJ.isValid(cpf_cnpj) ? 'SELECT FROM \'RFBCNPJANDROID\'.\'CERTIDAO\'' : 'SELECT FROM \'RFB\'.\'CERTIDAO\'',
            this.loader('fa-archive', `Verificando a situação do documento ${this.cpf_cnpj} junto a Receita Federal.`, {
                data: {
                    documento: cpf_cnpj,
                    nascimento
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen(`Indisponibilidade de conexão com a fonte de dados - Receita Federal (${this.cpf ? 'Certidão Negativa' : 'Cartão do CNPJ'})`),
                success: data => {
                    let x = n => $(n, data).first().text();
                    let kelement = this.kronoosElement(null, `Situação Cadastral do ${this.cpf ? 'CPF' : 'CNPJ'} pela Receita Federal`,
                        'Consulta do documento na Receita Federal.', 'Certidão remetida pela Receita Federal.');

                    if (CPF.isValid(cpf_cnpj)) {
                        kelement.table('Nome', 'Código Comprovante')(x('nome'), x('codigo-comprovante'));
                        kelement.table('Data Consulta', 'Situação')(x('data-consulta'), x('situacao'));
                        kelement.table('Data de Nascimento', 'Data da Inscrição')(x('dataNascimento'), x('dataInscricao'));
                    } else {
                        kelement.table('Nome', 'CNPJ', 'Data de Abertura')(x('nome'), this.cnpj, x('data-abertura'));
                        kelement.table('Data Consulta', 'Situação', 'Data Situação')(x('data-consulta'), x('situacao'), x('data-situacao'));
                        kelement.table('EFR', 'Situação Especial', 'Data Situação Especial')(x('efr') || '*******', x('situacao-especial') || '*******', x('data-situacao-especial') || '*******');
                        kelement.table('Natureza Jurídica', 'Tipo CNPJ', 'Capital Social')(`${$('natureza-juridica', data).attr('codigo')} ${x('natureza-juridica')}`, x('tipo-cnpj'), numeral(parseInt(x('capitalSocial'))).format('$0,0.00'));
                        kelement.table('Atividade Econômica', 'E-mail', 'Telefone')(`${$('atividade-economica', data).attr('codigo') || ''} ${x('atividade-economica')}`,
                            x('email'), x('telefones'));
                        // kelement.table("Cartão do CNPJ")
                        //     ($("<a />").text("Comprovante de Consulta").attr("href", "#").click(e => {
                        //         e.preventDefault();
                        //         this.openReceipts(data);
                        //     }));

                        let v = n => $(`endereco ${n}`, data).text();
                        kelement.list('Endereço')(`${v('logradouro')}, ${v('numero')} ${v('complemento')} - ${v('cep')}, ${v('bairro')}, ${v('municipio')} / ${v('uf')}`);

                        if (v('uf') === 'SP') {
                            this.searchJucesp(x('nome'));
                        }

                        let geocode = `${v('logradouro')}, ${v('numero')} - ${v('bairro')} - ${v('municipio')}, ${v('uf')} - ${v('cep')}`;
                        this.serverCall('SELECT FROM \'KRONOOS\'.\'GEOCODE\'',
                            this.loader('fa-map', `Localizando para o documento ${this.cpf_cnpj} o endereço inscrito no CEP ${VMasker.toPattern(v('cep'), '99999-999')}.`, {
                                dataType: 'json',
                                data: {
                                    address: geocode
                                },
                                success: geo => this.geocodes.push(geo)
                            }));

                        let atividadesSecundarias = $('atividade-secundaria', data);
                        if (atividadesSecundarias.length) {
                            let atividades = kelement.captionTable('Atividades Secundárias', 'CNAE', 'Qualificação');
                            atividadesSecundarias.each(function() {
                                atividades($(this).attr('codigo'), $(this).text());
                            });
                        }

                        let socios = $('socio', data);
                        if (socios.length) {
                            let qsa = kelement.captionTable('Quadro Social', 'Qualificação', 'Nome do Sócio');
                            socios.each(function() {
                                qsa($(this).attr('qualificacao'), $(this).text());
                            });
                        }

                    }

                    kelement.behaviourAccurate(!['REGULAR', 'ATIVA'].includes(x('situacao').split(' ')[0]));
                    this.append(kelement.element());
                },
            }, true));
    }

    informationQA() {
        let groupContent = _.groupBy(_.map(_.filter(this.kelements), kelement => kelement.notation()), r => r[0]);
        return _.object(_.keys(groupContent), _.map(groupContent, n => _.countBy(n, i => i[1])));
    }

    // changeResult() {
    //     if (this._notFoundObject && this._notFoundObject.list.is(':empty')) {
    //         this._notFoundObject.container.remove();
    //         this._notFoundObject = null;
    //         this._notFoundList = null;
    //     }

    //     if (this._briefElement && this._briefElement.find('ol').is(':empty')) {
    //         this._brief = null;
    //         this._briefElement.remove();
    //         this._briefElement = null;
    //     }

    //     this.firstElement().stageClear();
    //     let informationQA = this.informationQA();
    //     if (informationQA.hasNotation && informationQA.hasNotation.behaviourAccurate) {
    //         this.header.element
    //             .removeClass('kronoos-hasNotation')
    //             .removeClass('kronoos-hasntNotation')
    //             .addClass('kronoos-hasConfirmedNotation');
    //     } else if (informationQA.hasNotation) {
    //         this.header.element
    //             .removeClass('kronoos-hasConfirmedNotation')
    //             .removeClass('kronoos-hasntNotation')
    //             .addClass('kronoos-hasNotation');
    //     } else {
    //         this.header.element
    //             .removeClass('kronoos-hasConfirmedNotation')
    //             .removeClass('kronoos-hasNotation')
    //             .addClass('kronoos-hasntNotation');
    //     }

    //     if (this.titleCanChange) {
    //         if (informationQA.hasNotation) {
    //             this.firstElement().title('Constam Apontamentos Cadastrais');
    //             this.firstElement().subtitle('Há apontamento cadastral registrado no sistema Kronoos.');
    //             this.firstElement().sidenote('Constam apontamentos cadastrais.');
    //         } else {
    //             this.firstElement().title('Não Constam Apontamentos Cadastrais');
    //             this.firstElement().subtitle('Não há nenhum apontamento cadastral registrado no sistema Kronoos.');
    //             this.firstElement().sidenote('Não consta nenhum apontamento cadastral.');
    //         }

    //     }
    //     for (let notationType in informationQA) {
    //         let pieces = [];
    //         let notationMessage;
    //         let icon = 'exclamation';
    //         switch (notationType) {
    //         case 'hasNotation':
    //             notationMessage = ['apresenta registro nos órgãos pesquisados', 'apresentam registros nos órgãos pesquisados'];
    //             break;
    //         case 'hasntNotation':
    //             notationMessage = ['não apresenta registro nos órgãos pesquisados', 'não apresentam registros nos órgãos pesquisados'];
    //             break;
    //         default:
    //             notationMessage = ['de registro desconhecido e', 'de registros desconhecidos e'];
    //         }
    //         for (let behaviourType in informationQA[notationType]) {
    //             let behaviourMessage;
    //             switch (behaviourType) {
    //             case 'behaviourAccurate':
    //                 if (notationType === 'hasntNotation') icon = 'check';
    //                 else icon = 'times';
    //                 behaviourMessage = ['', ''];
    //                 break;
    //             case 'behaviourUnstructured':
    //                 behaviourMessage = [' e pode conter dados não estruturados, devendo ser verificado ', ' e podem conter dados não estruturados, devendo ser verificados'];
    //                 break;
    //             case 'behaviourUnstructuredHomonym':
    //                 behaviourMessage = [' e pode conter homônimos e dados não estruturados, devendo ser verificado', ' e podem conter homônimos e dados não estruturados, devendo ser verificados'];
    //                 break;
    //             case 'behaviourHomonym':
    //                 behaviourMessage = [' e pode conter homônimos, devendo ser verificado', ' e podem conter homônimos, devendo ser verificados'];
    //                 break;
    //             default:
    //                 behaviourMessage = ['pendente de verificação', 'pendentes de verificação'];
    //             }

    //             let searchMessage;
    //             if (informationQA[notationType][behaviourType] > 1) {
    //                 searchMessage = `${informationQA[notationType][behaviourType]} resultados encontrados ${notationMessage[1]} ${behaviourMessage[1]}.`;
    //             }   else {
    //                 searchMessage = `1 resultado encontrado ${notationMessage[0]} ${behaviourMessage[0]}.`;
    //             }
    //             this.firstElement().stage(icon, searchMessage.replace(/\s+,/, ',')).addClass(`type-${notationType}-${behaviourType}`);
    //         }
    //     }

    //     this.controller.trigger('kronoos::changeResult');
    // }

    firstElement() {
        return this.kelements[0];
    }

    kronoosElement(group, ...args) {
        let kelement = this.call('kronoos::element', ...args);
        if (this.kelements.length && group) kelement.notFound = (element, ...x) => this.notFound(element, group, ...x);
        kelement.brief = (...args) => this.brief(...args);
        this.kelements.push(kelement);
        // kelement.aggregate(() => this.changeResult());
        kelement.behaviourAccurate(false);
        return kelement;
    }

    searchCeis() {
        this.serverCall('SELECT FROM \'PORTALTRANSPARENCIA\'.\'CEIS\'',
            this.loader('fa-archive', `Verificando empresas de pessoas físicas sancionadas pelo documento ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf_cnpj
                },
                error: () => this.notFoundAdm('CEIS – Cadastro Nacional de Empresas Inidôneas e Suspensas'),
                success: data => {
                    let x = n => $(n, data).text();

                    let kelement = this.kronoosElement(null, 'CEIS – Cadastro Nacional de Empresas Inidôneas e Suspensas',
                        'Cadastro Nacional de Empresas Inidôneas e Suspensas de celebrar convênios, contratos de repasse ou termos de parceria com a administração pública federal', 'Controladoria Geral da União (CGU)');
                    kelement.behaviourAccurate(true);

                    kelement.table('Tipo da sanção', 'Fundamentação legal')(x('TIPO-DA-SANCAO'), x('FUNDAMENTACAO-LEGAL'));
                    kelement.table('Descrição da fundamentação legal')(x('DESCRICAO-DA-FUNDAMENTACAO-LEGAL'));
                    kelement.table('Data de início da sanção')(x('DATA-DE-INICIO-DA-SANCAO'));
                    kelement.table('Data de fim da sanção', 'Data de publicação sanção')(x('DATA-DE-FIM-DA-SANCAO'), x('DATA-DE-PUBLICACAO-SANCAO'));
                    kelement.table('Número do processo', 'Órgão sancionador')(x('NUMERO-DO-PROCESSO'), x('ORGAO-SANCIONADOR'));
                    kelement.table('UF do órgão sancionador', 'Origem da informação')(x('UF-DO-ORGAO-SANCIONADOR'), x('ORIGEM-DA-INFORMACAO'));

                    if (x('NUMERO-DO-PROCESSO')) {
                        let proc = VMasker.toPattern(x('NUMERO-DO-PROCESSO').replace(NON_NUMBER, ''), '9999999-99.9999.9.99.9999');
                        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'', this.loader('fa-balance-scale', `Verificando processo CEIS ${proc} para o documento ${this.cpf_cnpj}`, {
                            data: {
                                data: `SELECT FROM 'CNJ'.'PROCESSO' WHERE 'PROCESSO' = '${proc}'`
                            },
                            success: data => {
                                this.juristekCNJ(data, null, true, false);
                            }
                        }));
                    }

                    this.append(kelement.element());
                },
            }, true));
    }

    searchMandado(idLog, numeroMandado) {
        this.serverCall('SELECT FROM \'PROCURADOS\'.\'MANDADO\'',
            this.loader('fa-eye-slash', `Verificando mandado de prisão ${numeroMandado}.`, {
                data: {
                    idLog,
                    numero: numeroMandado
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Mandados de Prisão (SINESP)'),
                success: data => {
                    let x = n => $(n, data).first().text();
                    let mae = x('genitoras');
                    if (this.mae && mae && this.normalizeName(this.mae) != this.normalizeName(mae)) return;

                    let kelement = this.kronoosElement(null, 'Mandado de Prisão',
                        'Existência de apontamentos cadastrais.', 'Mandado de prisão expedido.');

                    if ((!this.mae || !mae) && this.homonymous > 1) kelement.behaviourHomonym(true);
                    else kelement.behaviourAccurate(true);

                    kelement.table('Numero do Mandado', 'Data do Mandado')(x('numeroMandado'), x('dataMandado'));
                    kelement.table('Genitora', 'Genitor')(x('genitoras'), x('genitores'));
                    kelement.table('Validade', 'Orgão Julgador')(x('dataValidade'), `${x('orgaoJulgador nome')} - ${x('orgaoJulgador municipio')} / ${x('orgaoJulgador UF')}`);
                    kelement.table('Síntese da Decisão')(x('sinteseDecisao'));
                    this.append(kelement.element());
                },
            }, true), highPriority);
    }

    searchMandados() {
        /* DEBUG PELO CPF 32078569852 */
        if (!this.cpf || !CPF.isValid(this.cpf)) return;
        this.serverCall('SELECT FROM \'PROCURADOS\'.\'CONSULTA\'',
            this.loader('fa-eye-slash', `Verificando mandados de prisão através do CPF/CNPJ ${this.cpf_cnpj}.`, {
                data: {
                    documento: this.cpf,
                    nome: this.name
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados - Mandados de Prisão (SINESP)'),
                success: data => {
                    let idLog = $('idLog', data).text();
                    var ctx = this;
                    $('CNJ > retorno > node', data).each(function() {
                        if ($('pessoa', this).text().toLowerCase() != ctx.name.toLowerCase())
                            return;
                        ctx.searchMandado(idLog, $('numeroMandado', this).text());
                    });
                },
            }, true), lowPriority);
    }

    downloadMarkdown() {
        let htmlContent = this.appendElement
            .children()
            .filter((i, e) => !$(e).hasClass('kronoos-header'))
            .map((i, e) => $(e).html()).toArray().join();

        saveAs(new Blob([toMarkdown(htmlContent)]),
            `${moment().format('YYYY-MM-DD')}-${this.name}-${this.cpf_cnpj}.txt`);
    }

    printData() {
        return {
            template: 'kronoos-dossier-print',
            data: JSON.stringify({
                nome: this.name,
                documento: this.cpf_cnpj,
                elements: _.map(_.filter(this.kelements, n => n && !n.element().find('.certidao').length), originalContext => {
                    let element = originalContext.element().clone();
                    $('a[href]', element).each(function () { $(this).text($(this).attr('href')); });
        		    let walk = document.createTreeWalker(element.get(0), NodeFilter.SHOW_TEXT, null, false);

                    let n;
                    while ((n = walk.nextNode())) {
                        n.textContent = n.textContent.replace(/[\n\r\t]/g, ' ');
                    }

                    element.find('kronoos-buy').remove();

                    element.find('.result-network canvas').each((x, e) => $(e).replaceWith($('<img />').attr({
                        src: originalContext.element().find('.result-network canvas').get(0).toDataURL('image/png', 1)
                    })));

                    element.find('*').removeAttr('style');

                    return element.html();
                }).join('')
            })
        };
    }

    generateZip(blobCallback) {
        let printData = this.printData();
        this.serverCall('SELECT FROM \'EXPORTVIEW\'.\'PDF\'', this.loader('fa-file-pdf-o', `Exportando o dossiê capturado de ${this.name} para PDF.`, {
            method: 'POST',
            dataType: 'json',
            data: printData,
            success: data => {
                let zip = new JSZip();

                zip.file(`${moment().format('YYYY-MM-DD')}-${this.name}-${(CNPJ.isValid(this.cpf_cnpj) ?
                    CNPJ : CPF).strip(this.cpf_cnpj)}.pdf`, data, {
                    base64: true
                });
                let certidoesDirectory = zip.folder('certidoes');
                _.map(_.filter(this.kelements, e => !!e), element => element.element().find('a[download]').each((i, e) =>
                    certidoesDirectory.file($(e).attr('download'), $(e).attr('href').split(',')[1], {
                        base64: true
                    })));
                zip.generateAsync({
                    type: 'blob'
                }).then(content => blobCallback(content));
            }
        }));
    }

    downloadPDF() {
        this.generateZip(content => saveAs(content, `${moment().format('YYYY-MM-DD')}-${this.name}-${(CNPJ.isValid(this.cpf_cnpj) ?
            CNPJ : CPF).strip(this.cpf_cnpj)}.zip`));
    }

    downloadXLSX() {
        let unregisterLoader = this.controller.call('kronoos::status', 'fa-file-excel-o', `Gerando arquivo Excel para ${this.name}, documento ${this.cpf_cnpj}`);
        XlsxPopulate.fromBlankAsync().then(workbook => {
            let sheet = workbook.sheet(0);

            let header = sheet.row(1);

            header.cell(1).value('Partes').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(2).value('Tipo de Acao').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(3).value('Numero do Processo').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(4).value('Fórum / Vara').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(5).value('Dt. Distrib.').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(6).value('Vl. da Causa').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });
            header.cell(7).value('Posição Atual').style({
                fill: 'eeeeee',
                bold: true,
                horizontalAlignment: 'center'
            });

            let row = 2;
            _.map(_.values(this.procElements), element => {

                let proc = element.element().data('parsedProc');
                if (!proc) return;

                let g = selector => $(selector, proc).first().text();

                let currentRow = sheet.row(row++);
                currentRow.cell(1).value($('partes parte', proc)
                    .map((i, e) => `${$(e).attr('tipo')}: ${$(e).text()}`)
                    .toArray().join(' - ')); // Partes

                currentRow.cell(2).value(g('acao') || g('area')); // Tipo de Acao
                let numeroProcesso = currentRow.cell(3).value(g('numero_processo')); // Numero do Processo
                let urlProcesso = g('url_processo');
                if (urlProcesso) {
                    numeroProcesso.hyperlink(urlProcesso);
                }

                currentRow.cell(4).value([g('foro') || g('origem_processo'), g('vara')].filter(x => !!x).join(' / ')); // Forum / Vara
                currentRow.cell(5).value(g('andamento:last data')); // Posição Atual
                currentRow.cell(6).value(g('valor_causa')); // Valor da Causa
                currentRow.cell(7).value(`${g('andamento data')}: ${g('andamento descricao')}`); // Posição Atual
            });

            workbook.outputAsync().then(blob => {
                unregisterLoader();
                saveAs(blob, `${moment().format('YYYY-MM-DD')}-${this.name}-${this.cpf_cnpj}.xlsx`);
            });
        });
    }

    downloadXLSXEmail() {
        this.serverCall('INSERT INTO \'NOYSPROJURIS\'.\'DATA\'', this.loader('fa-file-excel-o', `Exportando processos capturados de ${this.name} para seu endereço de e-mail.`, {
            data: {
                table: JSON.stringify(Object.keys(this.procElements).map(x => [x])),
                interface: JSON.stringify(['', '1', '2', '2', [{
                    db: 'PROJURIS',
                    table: 'PROJURIS'
                }],
                [],
                []
                ])
            },
            success: data => this.alert({
                icon: 'pass',
                title: `Parabéns! Os processos do documento ${this.cpf || this.cnpj} de ${this.name} estão sendo exportados.`,
                subtitle: `Você receberá um e-mail assim que a operação para ${this.name} for concluída.`,
                paragraph: `Todos os processos do documento ${this.cpf || this.cnpj} de ${this.name} estão sendo exportados,
                                        aguarde o recebimento do email com o arquivo.`
            })

        }));
    }

    downloadDOCX() {
        let htmlContent = this.appendElement
            .children()
            .filter((i, e) => !$(e).hasClass('kronoos-header'))
            .map((i, e) => $(e).html()).toArray().join();

        saveAs(htmlDocx
            .asBlob(`<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>${htmlContent}</body></html>`, {
                orientation: 'portrait'
            }),
        `${moment().format('YYYY-MM-DD')}-${this.name}-${this.cpf_cnpj}.docx`);
    }

    downloadImage() {
        html2canvas(this.appendElement, {
            background: '#FFFFFF',
            onrendered(canvas) {
                canvas.toBlob(blob =>
                    saveAs(blob, `${moment().format('YYYY-MM-DD')}-${this.name}-${this.cpf_cnpj}.png`),
                'image/png',
                0.95);
            }
        });
    }

    generateHeader(defaultType = 'minimized') {
        let observation = ''; /* empty */
        if (this.parameters.observation)
            observation = `, ${this.parameters.observation}`;

        this.header = {
            container: $('<div />').addClass('container'),
            content: $('<div />').addClass('content'),
            element: $('<div />').addClass('kronoos-header'),
            actions: $('<ul />').addClass('kronoos-actions'),
            title: $('<div />').addClass('kronoos-title').text(`Informações - ${this.name}`),
            subtitle: $('<div />').addClass('kronoos-subtitle').text(`${this.cpf ? 'CPF' : 'CNPJ'}: ${this.cpf_cnpj}${observation}`)
        };
        this.header.container.data('instance', this);
        this.appendElement.prepend(this.header.element).addClass(defaultType);
        this.header.element.append(this.header.container);
        this.header.container.append(this.header.content);
        this.header.content.append(this.header.actions);
        this.header.content.append(this.header.title);
        this.header.content.append(this.header.subtitle);

        var icon = 'fa-minus-square-o';
        if (defaultType == 'minimized') {
            icon = 'fa-plus-square-o';
        }

        this.header.actionElements = {
            push: $('<i />').addClass('fa fa-eye'),
            windowResize: $('<i />').addClass(`fa ${icon}`),
            trash: $('<i />').addClass('fa fa-trash'),
            download: $('<i />').addClass('fa fa-cloud-download'),
        };

        this.header.actionElements.download.click(e => {
            e.preventDefault();

            let modal = this.call('modal');

            modal.gamification('accuracy');
            modal.title('Exportação de Dossiê');
            modal.subtitle('Escolha o formato de exportação do dossiê.');
            modal.paragraph('O dossiê exportado pode perder características de estilo ou não funcionar em todos os programas.');

            let form = modal.createForm();
            let list = form.createList();

            let clickEvent = action => e => {
                e.preventDefault();
                this[action]();
                modal.close();
            };

            // list.add('fa-file-word-o', 'DOCX - Microsoft Word 2007 (Windows)').click(clickEvent('downloadDOCX'));
            list.add('fa-file-excel-o', 'Excel simples de processos instantâneo.').click(clickEvent('downloadXLSX'));
            list.add('fa-file-excel-o', 'Excel de processos via e-mail.').click(clickEvent('downloadXLSXEmail'));
            list.add('fa-file-pdf-o', 'Dossiê em formato PDF.').click(clickEvent('downloadPDF'));
            modal.createActions().cancel();
        });

        this.header.actionElements.push.click(e => {
            e.preventDefault();
            this.confirm({
                title: 'Deseja acompanhar o documento?',
                subtitle: `Acompanhamento para o ${this.cpf ? 'CPF' : 'CNPJ'} ${this.cpf_cnpj}.`,
                paragraph: 'O sistema irá te informar a respeito de quaisquer novas alterações das informações deste relatório / target.',
            }, () => {
                this.controller.server.call('INSERT INTO \'DOSSIERKRONOOS\'.\'CAPTURE\'', this.controller.call('error::ajax', {
                    dataType: 'json',
                    data: {
                        documento: this.cpf_cnpj,
                        name: this.name
                    },
                    success: () => {
                        this.alert({
                            icon: 'pass',
                            title: `Parabéns! O documento ${this.cpf || this.cnpj} está sendo acompanhando.`,
                            subtitle: `Você receberá um e-mail caso ocorra alguma atualização no cadastro de ${this.name}`,
                            paragraph: `Verificaremos diariamente o documento informado ${this.cpf || this.cnpj} em busca de alterações,
                            caso ocorra alguma nós encaminharemos um e-mail para o endereço cadastrado.`
                        });
                    }
                }));
            });
        });

        this.header.actionElements.windowResize.click(e => {
            e.preventDefault();
            let isMinimized = this.appendElement.hasClass('minimized');
            this.appendElement[isMinimized ? 'removeClass' : 'addClass']('minimized');
            this.appendElement[isMinimized ? 'addClass' : 'removeClass']('maximized');
            this.header.actionElements.windowResize[isMinimized ? 'removeClass' : 'addClass']('fa-plus-square-o');
            this.header.actionElements.windowResize[isMinimized ? 'addClass' : 'removeClass']('fa-minus-square-o');
        });

        this.header.actionElements.trash.click(e => {
            e.preventDefault();
            this.kill();
            this.appendElement.remove();
        });

        this.call('tooltip', this.header.actions, 'Remover')
            .append(this.header.actionElements.trash);
        this.call('tooltip', this.header.actions, 'Expandir / Minimizar')
            .append(this.header.actionElements.windowResize);
        this.call('tooltip', this.header.actions, 'Download')
            .append(this.header.actionElements.download);
        this.call('tooltip', this.header.actions, 'Acompanhar')
            .append(this.header.actionElements.push);
    }

    confirm(...args) {
        this.controller.confirm(...args);
    }

    alert(...args) {
        this.controller.alert(...args);
    }

    parseKronoos(kronoosData) {
        if (!kronoosData) return;

        $('BPQL body item', kronoosData).each((idx, element) => {
            let cpfFilter = $('CPF', element).text().replace(NON_NUMBER, '');
            if (this.cpf && cpfFilter && cpfFilter != this.cpf.replace(NON_NUMBER, '')) {
                return;
            }

            if (cpfFilter && this.cnpj) {
                return;
            }

            let cnpjFilter = $('CNPJ', element).text().replace(NON_NUMBER, '');
            if (this.cnpj && cnpjFilter && cnpjFilter != this.cnpj.replace(NON_NUMBER, '')) {
                return;
            }

            if (cnpjFilter && this.cpf) {
                return;
            }

            let namespace = $('namespace', element).text();
            let title = 'Apontamento Positivo';
            let description = 'Consta apontamento positivo';
            if (namespace && namespace in NAMESPACE_DESCRIPTION) {
                [title, description] = NAMESPACE_DESCRIPTION[namespace];
            }
            let kelement = this.kronoosElement(null, title, 'Existência de apontamentos cadastrais.', description);
            let notes = $('notes node', element);
            let source = $('source node', element);
            let position = $('position', element);
            let insertMethod = 'append';
            let insertElement = this.appendElement;

            if (cnpjFilter || cpfFilter || this.homonymous <= 1) {
                kelement.behaviourAccurate(true);
            } else {
                kelement.behaviourHomonym(true);
            }

            if (notes.length) {
                let knotes = kelement.list('Notas');
                notes.each(idx => {
                    knotes(notes.eq(idx).text());
                });
            }

            if (source.length || position.length) {
                if (source.length && !position.length) {
                    let ksources = kelement.list('Fontes');
                    source.each(idx => {
                        let s = source.eq(idx).text();
                        ksources($('<a />').attr({
                            href: s,
                            target: '_blank'
                        }).text(s).html());
                    });

                } else if (!source.length && position.length) {
                    kelement.list('Marcação')(position.text());
                } else {
                    let ktable = kelement.table('Marcação', 'Fontes');
                    source.each(i => {
                        let s = source.eq(i).text();
                        ktable(position.eq(i).text(), $('<a />').attr({
                            href: s,
                            target: '_blank'
                        }).text(s).html());
                    });
                }
            }

            insertElement[insertMethod](kelement.element());
            searchBar.addClass('minimize').removeClass('full');
        });
    }

    parseProc(proc, article, match) {
        if (this.procElements[proc]) return false;
        let kelement = this.kronoosElement(null, `Processo Nº ${proc}`,
            'Obtido em recorte de diário oficial.',
            'Foram encontradas informações, confirmação pendente pelo sistema Kronoos.');

        if (this.homonymous > 1) kelement.behaviourUnstructuredHomonym(true);
        else kelement.behaviourUnstructured(true);

        this.procElements[proc] = kelement;
        kelement.paragraph(article.replace(match, `<strong>${match}</strong>`));
        this.append(kelement.element().attr('id', `cnj-${proc.replace(NON_NUMBER, '')}`));

        this.juristekDetectCNJ(proc, data => {
            if (!data) return;
            kelement.table('Tribunal')($('<a />').text(data.description).attr({
                target: '_blank',
                href: data.url
            }));
        });

        return true;
    }

    jucespQuery(name, callback, cpf_cnpj) {
        this.serverCall('SELECT FROM \'JUCESP\'.\'SEARCH\'', this.loader('fa-archive', `Procurando conexões com o NIRE da empresa ${name} junto a JUCESP.`, {
            data: {
                data: name || this.name
            },
            error: () => callback(),
            success: data => async.each($('nire', data).map((i, e) => $(e).text()).toArray(), (nire, callback) => {
                this.serverCall('SELECT FROM \'JUCESP\'.\'DOCUMENT\'', this.loader('fa-archive', `Procurando conexões com a ficha cadastral da empresa ${name} (NIRE: ${nire}) junto a JUCESP.`, {
                    data: {
                        nire
                    },
                    success: data => {
                        this.generateRelations.appendDocument(data, cpf_cnpj);
                    },
                    complete: () => callback()
                }));
            }, () => callback())
        }));
    }

    query(query, cpf_cnpj, elements, sideQuest = null) {
        let key = `${query}.'${cpf_cnpj}'`;
        if (this.cpf_cnpjs[key]) {
            return;
        }

        this.cpf_cnpjs[key] = true;
        elements.push(callback => this.serverCall(query,
            this.loader('fa-eye', `Capturando dados de conexão através do CPF/CNPJ ${this.cpf_cnpj}.`, {
                data: {
                    documento: cpf_cnpj,
                    cpf: cpf_cnpj,
                    cnpj: cpf_cnpj,
                    mostrarTodos: 1
                },
                success: data => {
                    this.generateRelations.appendDocument(data, cpf_cnpj);
                    if (sideQuest) {
                        let ptrCallback = callback;
                        callback = () => sideQuest(data, ptrCallback);
                    }
                },
                complete: () => callback()
            }, true)));
    }

    emptyChecker() {
        if (!this.kelements.length) {
            let [title, description] = NAMESPACE_DESCRIPTION.clear;
            let nelement = this.kronoosElement(null, title, null, null);
            this.titleCanChange = true;
            this.append(nelement.element());
            searchBar.addClass('minimize').removeClass('full');
        }
    }

    kill() {
        this.controller.call('kronoos::ajax::queue::remove', task => {
            if (task.data.parser.uniqid == this.uniqid) {
                if (task.data.call[1].complete) task.data.call[1].complete();
                return true;
            }
            return false;
        });
        for (let xhr of this.xhr)
            if (xhr) xhr.abort();

        if (this.taskGraphTrack) this.taskGraphTrack.kill();
        if (this.taskGraphParallel) this.taskGraphParallel.kill();
        if (this.mptSync && this.mptSync.kill) this.mptSync.kill();
        if (this.tribunaisSync && this.tribunaisSync.kill) this.tribunaisSync.kill();
        if (this.mptSync && this.confirmQueue) this.confirmQueue.kill();
    }

    graphTrack() {
        let dontAskAgainInput = false,
             dontAskAgain = {},
             defaultActionSearch = {};

        this.taskGraphTrack = async.timesSeries(this.depth, (i, callback) => this.generateRelations.track(data => {
            let elements = [];
            _.map(data.nodes, node => {
                let formatted_document = pad(node.id.length > 11 ? 14 : 11, node.id, '0');
                if (!CPF.isValid(formatted_document) && !CNPJ.isValid(formatted_document)) return;
                let cpf_cnpj = (CPF.isValid(formatted_document) ? CPF : CNPJ).format(formatted_document);

                this.query('SELECT FROM \'RFB\'.\'CERTIDAO\'', formatted_document, elements, (data, callback) => {
                    if (!CNPJ.isValid(formatted_document)) {
                        callback();
                        return;
                    }
                    if ($('uf', data).text() !== 'SP') {
                        callback();
                        return;
                    }

                    this.jucespQuery($('nome', data).text(), callback, formatted_document);
                });

                if (CNPJ.isValid(formatted_document)) {
                    this.query('SELECT FROM \'RECUPERA\'.\'LOCALIZADORPARTEMPRESARIALPJ\'', formatted_document, elements);
                }

                this.query('SELECT FROM \'CBUSCA\'.\'CONSULTA\'', formatted_document, elements);
                this.query('SELECT FROM \'CCBUSCA\'.\'CONSULTA\'', formatted_document, elements);
                this.query('SELECT FROM \'CCBUSCA\'.\'CONSULTA\'', formatted_document, elements);

                if (CNPJ.isValid(formatted_document)) {
                    this.query('SELECT FROM \'RECUPERA\'.\'LOCALIZADORPJFILIAIS\'', formatted_document, elements, (data, cb) => {
                        let currentDocument = 1;
                        let works = true;
                        async.doUntil(callback => {
                            let document = `${formatted_document.substr(0, 8)}${pad(4, (currentDocument++).toString(), '0')}`;
                            document += this.verifierDigit(document);
                            document += this.verifierDigit(document);
                            let fdocument = CNPJ.format(document);
                            if (this.cpf_cnpjs[fdocument] || $('CNPJ', data).filter((i, v) => $(v).text() == document).length) {
                                /* already exists */
                                cb();
                                return;
                            }

                            this.serverCall('SELECT FROM \'RFBCNPJANDROID\'.\'CERTIDAO\'', this.loader('fa-eye', `Verificando filiais para o CNPJ ${cpf_cnpj}.`, {
                                data: {
                                    documento: document
                                },
                                success: data => {
                                    this.generateRelations.appendDocument(data, cpf_cnpj);
                                    callback();
                                },
                                error: (...args) => {
                                    works = false;
                                    callback(args);
                                }
                            }));
                        }, () => !works, () => {
                            cb();
                        });
                    });
                }

                if (CPF.isValid(formatted_document)) {
                    this.query('SELECT FROM \'FINDER\'.\'RELATIONS\'', formatted_document, elements);
                }

                if (!this.cpf_cnpjs[cpf_cnpj]) {
                    this.cpf_cnpjs[cpf_cnpj] = true;

                    let searchTarget = cb => this.serverCall('SELECT FROM \'KRONOOS\'.\'API\'', this.errorAjax(
                        this.loader('fa-eye', `Pesquisando correlações através do nome ${node.label}, documento ${this.cpf_cnpj}.`, {
                            data: {
                                documento: formatted_document,
                                name: `"${node.label.replace('\n', '')}"`
                            },
                            success: data => {
                                this.call('kronoos::parse', node.label, formatted_document, data, null, 'minimized', {
                                    observation: `relacionado ao ${this.cpf ? 'CPF' : 'CNPJ'} ${this.cpf_cnpj} - ${this.name}.`
                                });
                            },
                            complete: () => cb()
                        })));

                    elements.push(callback => this.confirmQueue.push(cb => {
                        let edge = _.find(data.edges, edge => edge.from == node.id || edge.to == node.id);
                        let connection = _.find(data.nodes, c => c.id == (edge.from == node.id ? edge.to : edge.from));

                        if (dontAskAgain[edge.relationType]) {
                            if (defaultActionSearch[edge.relationType]) searchTarget(cb);
                            else cb();
                            return;
                        }

                        this.call('confirm', {
                            title: `Você deseja consultar também o dossiê de ${node.label} que é relacionado em ${i+1}º grau com o target?`,
                            subtitle: `${node.label}, documento ${cpf_cnpj} é relacionado com ${this.name}.`,
                            paragraph: `A conexão é para ${connection.label} <small>(${f(connection.id)})</small> do tipo ${edge.relationType}.`
                        }, () => {
                            dontAskAgain[edge.relationType] = dontAskAgainInput[1].is(":checked");
                            defaultActionSearch[edge.relationType] = true;
                            searchTarget(cb);
                        }, () => {
                            dontAskAgain[edge.relationType] = dontAskAgainInput[1].is(":checked");
                            defaultActionSearch[edge.relationType] = false;
                            cb();
                        }, (modal, form, actions) => {
                            dontAskAgainInput = form.addCheckbox("confirm", `Aplicar ação para todos os targets relacionados (${edge.relationType}).`);
                        });
                    }, () => callback()));
                }
            });
            this.taskGraphParallel = async.parallel(elements, () => callback());
        }), () => {
            const error = (obj = {}) => this.alert(Object.assign({
                title: 'Não foi possível pesquisar a pessoa solicitada.',
                subtitle: 'A informação de conexão que possuimos não permite rastreamento posterior',
                paragraph: 'É provável que não tenhamos metadados suficientes para realizar esta pesquisa.'
            }, obj));

            this.generateRelations.track(data => async.each(data.nodes, (node, cb) => {
                let document = pad(14, CNPJ.strip(node.id), '0');
                if (!CNPJ.isValid(document)) return cb();
                this.serverCall('SELECT FROM \'RFBCNPJANDROID\'.\'CERTIDAO\'', this.loader('fa-archive', `Atualizando nome do CNPJ ${CNPJ.format(document)} - ${node.label}`, {
                    data: {
                        documento: document
                    },
                    success: data => {
                        node.label = $('nome', data).first().text();
                    },
                    complete: () => cb()
                }));
            }, () => {
                if (!data.nodes.length)
                    return;
                this.networkData = data;
                this.writeNetworkTable();
                let element = this.firstElement();
                let [network, node] = element.addNetwork(data.nodes, data.edges, Object.assign(element.networkOptions, {
                    groups: data.groups
                }));
                network.on('click', params => {
                    if (!params.nodes[0]) {
                        return;
                    }

                    let doc = pad(params.nodes[0].length > 11 ? 14 : 11, params.nodes[0], '0');
                    if (!CPF.isValid(doc) && !CNPJ.isValid(doc)) {
                        error();
                        return;
                    }

                    let formatted_document = f(params.nodes[0]);
                    const name = this.networkData.nodes.find(node => node.id = params.nodes[0]).label;

                    if (!name) {
                        error();
                        return;
                    }

                    this.call('kronoos::parse', name, formatted_document, null, 'minimized', {
                        observation: `relacionado ao ${formatted_document ? 'CPF' : 'CNPJ'} ${doc} - ${this.name}.`
                    });

                    var win = window.open(`${document.location.origin}?k=${doc}`, '_blank');
                    if (win) win.focus();
                });
            }));
        });
    }

    writeNetworkTable() {
        if (!this.networkData.edges.length) return;
        let relationTable = this.firstElement().captionTable('Lista Relações', 'De', 'Com', 'Relação');
        _.map(this.networkData.edges, edge => {
            let from = _.find(this.networkData.nodes, node => edge.from == node.id);
            let to = _.find(this.networkData.nodes, node => edge.to == node.id);
            if (!from || !to) return;
            relationTable(`${from.label}<br /><small>${f(from.id)}</small>`, `${to.label}<br /><small>${f(to.id)}</small>`, capitalize(edge.relationType));
        });
    }

    errorAjax(...args) {
        return this.call('error::ajax', ...args);
    }

    searchCARFDocumento() {
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Buscando por processos jurídicos no CARF para ${this.name}, documento ${this.cpf_cnpj}.`, {
                data: {
                    data: `SELECT FROM 'CARF'.'DOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj}'`,
                },
                bipbopError: (type, message, code, push, xml) => !push && this.errorHappen('Indisponibilidade de conexão com a fonte de dados para a certidão - Conselho Administrativo de Recursos Fiscais'),
                success: jusSearch => {
                    if (!$('processo', jusSearch).length) {
                        this.notFoundOthers('Conselho Administrativo de Recursos Fiscais');
                    } else {
                        this.juristekCNJ(jusSearch, null, true, false);
                    }
                }
            }), lowPriority);
    }

    searchTjceDocument() {
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Buscando por processos jurídicos no TJCE para ${this.name}, documento ${this.cpf_cnpj}.`, {
                data: {
                    data: `SELECT FROM 'TJCEESAJ'.'PRIMEIRAINSTANCIADOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj}'`,
                },
                success: jusSearch => this.juristekCNJ(jusSearch, null, true, false, false)
            }), lowPriority);
    }

    searchTjce() {
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Buscando por processos jurídicos no TJCE para ${this.name}.`, {
                data: {
                    data: `SELECT FROM 'TJCEESAJ'.'PRIMEIRAINSTANCIANOME' WHERE 'NOME_PARTE' = '${this.name.replace('\'', '')}'`,
                },
                success: jusSearch => {
                    this.juristekCNJ(jusSearch, null, true, true, this.cnpj ? false : true);
                }
            }), lowPriority);
    }

    searchTjspDocument() {
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Buscando por processos jurídicos no TJSP para ${this.name}, documento ${this.cpf_cnpj}.`, {
                data: {
                    data: `SELECT FROM 'TJSP'.'PRIMEIRAINSTANCIADOCUMENTO' WHERE 'DOCUMENTO' = '${this.cpf_cnpj}'`,
                },
                success: jusSearch => {
                    this.juristekCNJ(jusSearch, null, true, false, false);
                }
            }), lowPriority);
    }

    searchTjsp() {
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Buscando por processos jurídicos no TJSP para ${this.name}.`, {
                data: {
                    data: `SELECT FROM 'TJSP'.'PRIMEIRAINSTANCIANOME' WHERE 'NOME_PARTE' = '${this.name.replace('\'', '')}'`,
                },
                success: jusSearch => {
                    this.juristekCNJ(jusSearch, null, true, true, this.cnpj ? false : true);
                }
            }), lowPriority);
    }

    jusSearch() {
        this.findOtherNames(names => names.map(name => {
            this.serverCall('SELECT FROM \'JUSSEARCH\'.\'CONSULTA\'',
                this.loader('fa-balance-scale', `Buscando por processos jurídicos para ${name}, documento ${this.cpf_cnpj}.`, {
                    data: {
                        data: this.normalizeName(name)
                    },
                    success: jusSearch => this.juristek(jusSearch, name)
                }), lowPriority);
        }));
    }

    juristek(jusSearch, name) {
        /* All fucking data! */
        const CNJ_NUMBER = new RegExp(`(${CNJ_REGEX_TPL})((?!${CNJ_REGEX_TPL}).)*${name || this.name}`, 'gi');
        let variable = `(${CNJ_REGEX_TPL})((?!${CNJ_REGEX_TPL}).)*${name || this.name}`;

        let cnjs = {};
        $('BPQL > body snippet', jusSearch).each((idx, article) => {
            let articleText = $(article).text();
            let match = CNJ_NUMBER.exec(articleText);

            if (!match) return;

            let cnj = VMasker.toPattern(pad(20, match[3].replace(NON_NUMBER, ''), '0'), '9999999-99.9999.9.99.9999');
            if (cnjs[cnj]) return;
            cnjs[cnj] = true;
            if (this.procElements[cnj]) return;

            if (this.cnpj) {
                if (!this.parseProc(cnj, articleText, match[0])) return;
                this.normalizeJuristek(cnj);
                return;
            }

            let articleData = articleText.substr(articleText.indexOf(match[0]) + 1);
            let end = articleData.slice(match[0].length - 1).search(/(\,|\.|\!|\-|\n)/);
            let articleShow = articleData.substr(0, match[0].length + end);
            this.serverCall('SELECT FROM \'POLYGLOT\'.\'DATA\'',
                this.loader('fa-cube', `Usando inteligência artificial no processo Nº ${cnj} para ${this.cpf_cnpj}.`, {
                    dataType: 'json',
                    method: 'POST',
                    data: {
                        data: articleShow
                    },
                    error: () => {
                        if (this.homonymous > 1 && this.name.split(' ').length < 3)
                            return;
                        if (!this.parseProc(cnj, articleText, match[0])) return;
                        this.normalizeJuristek(cnj);
                    },
                    success: data => {
                        let nameRow = name.split(' ').map(x => x.toLocaleLowerCase());
                        let matches = this.testMatch(nameRow, data);

                        if (!this.completeName(matches, data)) {
                            return;
                        }

                        if (!this.completeName(matches.map(x => x - nameRow.length + 1), data, -1)) {
                            return;
                        }

                        if (!this.parseProc(cnj, articleText, match[0])) return;
                        this.normalizeJuristek(cnj);
                    }
                }));
        });
    }

    completeName(matches, data, direction = 1) {
        for (let index of matches) {
            let plusOne = data[index + (1 * direction)];
            let plusTwo = data[index + (2 * direction)];
            if (plusOne && (plusOne[1] === 'PROPN' || BAD_NAMES.includes(plusOne[0]))) continue;
            if (plusOne && (plusOne[1] === 'ADP' || BAD_ADP.includes(plusOne[0].toLocaleLowerCase())) && plusTwo &&
                (BAD_NAMES.includes(plusTwo[0]) || plusTwo[1] == 'PROPN')) continue;
            return true;
        }
        return false;
    }

    testMatch(nameRow, data) {
        let idx = 0;
        let ret = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i][0].toLocaleLowerCase() == nameRow[idx]) {
                idx++;
                if (idx === nameRow.length) {
                    idx = 0;
                    ret.push(i);
                }
            }
        }
        return ret;
    }

    compareNames(name) {
        let n1 = this.normalizeName(name);
        return this.otherNames.filter(e => n1 == this.normalizeName(e)).length > 0;
    }

    normalizeJuristek(cnj) {

        let hasNetworkIssue = () => {
            if (!this.procElements[cnj]) {
                return;
            }
            this.procElements[cnj].subtitle('Informação não estruturada pendente de confirmação humana.');
            this.procElements[cnj].canDelete();
        };

        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'',
            this.loader('fa-balance-scale', `Verificando processo Nº ${cnj} para ${this.cpf_cnpj}.`, {
                data: {
                    data: `SELECT FROM 'CNJ'.'PROCESSO' WHERE 'PROCESSO' = '${cnj}'`
                },
                success: ret => this.juristekCNJ(ret, cnj),
                /* melhorar o quesito de erro! */
                error: () => hasNetworkIssue(),
                bipbopError: (type, message, code, push, xml) => {
                    if (!push) {
                        hasNetworkIssue();
                        return;
                    }
                    if (!this.procElements[cnj]) {
                        return;
                    }
                    this.procElements[cnj].remove();
                    delete this.kelements[this.kelements.indexOf(this.procElements[cnj])];
                    delete this.procElements[cnj];
                    // this.changeResult();
                }
            }), lowPriority);

    }

    normalizeName(name) {
        return removeDiacritics(name).toUpperCase().replace(/\s+/g, ' ').replace(/[^A-Z0-9\s]/g, '').replace(/(\s|^)(SA|LTDA|ME|eireli)(\s|$)/ig, '');
    }

    juristekInfo(callback) {
        if (juristekInfo) return callback(juristekInfo);
        this.serverCall('SELECT FROM \'KRONOOSJURISTEK\'.\'DATA\'', this.loader('fa-balance-scale', 'Analisando numeração dos tribunais de justiça do país.', {
            data: {
                data: 'SELECT FROM \'INFO\'.\'INFO\''
            },
            success: data => {
                juristekInfo = data;
                callback(data);
            }
        }));

    }

    juristekDetectCNJ(cnj, callback) {
        let jtr = cnj.substr(-9).substr(0, 4); /* justiça e tribunal */
        let j = jtr[0]; /* justiça */
        let couldBeJTR = cnjCourtsMap[jtr] || cnjCourtsMap[j];
        if (!couldBeJTR || !Array.isArray(couldBeJTR) || !couldBeJTR.length) {
            return callback(null);
        }

        this.juristekInfo(data => {
            this.juristekDetectCNJWithData(callback, data, couldBeJTR);
        });
    }

    juristekDetectCNJWithData(callback, juristekInfo, couldBeJTR) {
        let tr = couldBeJTR[0];

        if (!tr) return callback(null);

        if (typeof tr == 'object') {
            tr = _.keys(tr)[0];
            if (!tr) return callback(null);
        }

        if (typeof tr !== 'string') return callback(null);

        let database = $(`body > database[name='${tr}']`, juristekInfo);

        if (!database.length) return callback(null);

        return callback({
            name: database.attr('name'),
            description: database.attr('description'),
            url: database.attr('url')
        });
    }

    juristekCNJ(ret, cnj = null, findProc = true, nameSearch = true, checkName = true) {
        try {
            this._juristekCNJ(ret, cnj, findProc, nameSearch, checkName);
        } catch (e) {
            console.error(e);
            if (cnj) {
                let cnjInstance = this.procElements[cnj];
                if (cnjInstance) {
                    delete this.procElements[cnj];
                    delete this.kelements[this.kelements.indexOf(cnjInstance)];
                }
            }
        }
    }

    _juristekCNJ(ret, cnj = null, findProc = true, nameSearch = true, checkName = true) {
        let cnjInstance = null;
        let proc = null;
        let numproc = null;
        if (cnj) {
            numproc = cnj;
            cnjInstance = this.procElements[cnj];
            let procs = $('processo', ret);

            if (checkName)
                procs = procs.filter((i, e) => {
                    if (!$('partes parte', e).length) return true;
                    return $('partes parte', e).filter((x, a) => this.compareNames($(a).text())).length > 0;
                });

            if (!procs.length) {
                cnjInstance.remove();
                delete this.procElements[cnj];
                delete this.kelements[this.kelements.indexOf(cnjInstance)];
                // this.changeResult();
                return;
            }

            proc = procs.first();
        } else {
            if (findProc) {
                let procs = $('processo', ret);
                if (checkName)
                    procs.filter((i, e) => {
                        if (!$('partes parte', e).length) return true;
                        return $('partes parte', e).filter((x, a) => this.compareNames($(a).text())).length > 0;
                    });
                procs.map((index, element) => this.juristekCNJ(element, null, false, nameSearch, checkName));
                return;
            }
            proc = ret;
            numproc = VMasker.toPattern($('numero_processo', proc).first().text().replace(NON_NUMBER, ''), '9999999-99.9999.9.99.9999');
            if (!numproc) numproc = '';
            if (numproc && this.procElements[numproc]) {
                cnjInstance = this.procElements[numproc];
                if (!cnjInstance.element().data('nameSearch')) return;
            } else {
                cnjInstance = this.kronoosElement(null, numproc ? `Processo Nº ${numproc}` : 'Processo Jurídico',
                    'Obtido em recorte de diário oficial.',
                    'Foram encontradas informações, confirmação pendente.');
                this.procElements[numproc] = cnjInstance;
                this.append(cnjInstance.element().attr('id', `cnj-${numproc.replace(NON_NUMBER, '')}`));
            }
        }

        if (checkName && $('partes parte', proc).length && !$('partes parte', proc).filter((x, a) => this.compareNames($(a).text())).length) {
            if (cnjInstance) {
                cnjInstance.remove();
                delete this.kelements[this.kelements.indexOf(cnjInstance)];
                delete this.procElements[numproc];
            }
            return;
        }

        if (!cnjInstance) return;
        if (!proc) return;

        cnjInstance.clear();
        cnjInstance.element().data('parsedProc', proc);
        cnjInstance.element().data('nameSearch', nameSearch);

        this.juristekDetectCNJ(numproc, data => {
            if (!data) return;
            cnjInstance.table('Tribunal')($('<a />').text(data.description).attr({
                target: '_blank',
                href: data.url
            }));
        });

        let urlProcesso;
        let getNode = x => $(x, proc).first().text();
        let partes = $('partes parte', proc);
        let andamentos = $('andamentos andamento', proc);

        let pieces = _.pairs({
            'Valor Causa': getNode('valor_causa'),
            Foro: getNode('foro'),
            'Origem do Processo': getNode('origem_processo'),
            Vara: getNode('vara'),
            Comarca: getNode('comarca'),
            'Número Antigo': getNode('numero_antigo'),
            'Número Processo': getNode('numero_processo'),
            Autuação: getNode('autuacao'),
            Localização: getNode('localizacao'),
            Ação: getNode('acao'),
            Área: getNode('area'),
            Situação: getNode('situacao'),
            Observação: getNode('observacao'),
            Classe: getNode('classe'),
            Distribuição: getNode('distribuicao'),
            Acesso: ((urlProcesso = getNode('url_processo')) ? $('<a />').attr({
                href: urlProcesso,
                target: '_blank'
            }).text('Acessar Processo') : null)
        });

        cnjInstance.subtitle('Existência de apontamentos cadastrais.');
        cnjInstance.sidenote('Participação em processo jurídico.');

        if (!nameSearch || this.homonymous <= 1) {
            cnjInstance.behaviourAccurate(true);
        } else {
            cnjInstance.behaviourHomonym(true);
        }

        this.controller.triggered('kronoos::juristek', [numproc, proc, pieces, cnjInstance, partes])
            .finally(() => {
                let validPieces = _.filter(pieces, t => {
                    if (!t[1]) return false;
                    return !/^\s*$/.test(t[1]);
                });

                let [keys, values] = _.unzip(validPieces);

                if (!keys) {
                    cnjInstance.remove();
                    delete this.kelements[this.kelements.indexOf(cnjInstance)];
                    delete this.procElements[numproc];
                    return;
                }

                for (let i = 0; i < keys.length; i += 2) {
                    cnjInstance.table(keys[i], keys[i + 1])(values[i], values[i + 1]);
                }

                let assunto = getNode('assunto');
                if (assunto) cnjInstance.paragraph(assunto);

                if (partes.length) {
                    let kparts = cnjInstance.list('Partes');
                    partes.each(idx => {
                        let node = partes.eq(idx);
                        kparts(`${node.attr('tipo')} - ${node.text()}`);
                    });
                }
            });
    }

    cartesian() {
        let r = [];
        let arg = arguments;
        let max = arg.length - 1;

        let helper = (arr, i) => {
            for (var j = 0, l = arg[i].length; j < l; j++) {
                var a = arr.slice(0); // clone arr
                a.push(arg[i][j]);
                if (i == max)
                    r.push(a);
                else
                    helper(a, i + 1);
            }
        };
        helper([], 0);
        return r;
    }

    append(...args) {
        return this.appendElement.append(...args);
    }

    verifierDigit(numbers) {
        var index = 2;
        var reverse = numbers.split('').reduce((buffer, number) => [parseInt(number, 10)].concat(buffer), []);

        var sum = reverse.reduce((buffer, number) => {
            buffer += number * index;
            index = (index === 9 ? 2 : index + 1);
            return buffer;
        }, 0);

        var mod = sum % 11;
        return (mod < 2 ? 0 : 11 - mod);
    }

}

export { KronoosParse };
