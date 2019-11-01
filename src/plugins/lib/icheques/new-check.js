import {
    CMC7Validator
} from './cmc7-validator';
import {
    CPF,
    CNPJ
} from 'cpf_cnpj';
import squel from 'squel';
import _ from 'underscore';
import StringMask from 'string-mask';
import validCheck from './data/valid-check';
import KeyCode from 'key-code';

const CMC7_BANK_ACCOUNT = /^(\d{3})(\d{4})\d{11}\d{4}(\d{7})\d$/;
const MATCH_NON_DIGITS = /[^\d]/g;
const CMC7_MASK = new StringMask('00000000 0000000000 000000000000');

module.exports = controller => {

    let newCheckWrapper = null;

    const setCMC7Document = (cmc7, document) => {
        localStorage[cmc7.replace(MATCH_NON_DIGITS, '')
            .replace(CMC7_BANK_ACCOUNT, 'check-$1-$2-$3')] = document;
    };

    const checkAlreadyExists = ({cmc}) => controller.database.exec(squel
        .select()
        .from('ICHEQUES_CHECKS')
        .field('COUNT(1)')
        .where('CMC = ?', cmc.replace(MATCH_NON_DIGITS, '')).toString())[0].values[0] > 0;

    controller.registerCall('icheques::check::alreadyExists', checkAlreadyExists);

    const getCMC7Storage = cmc7 => {
        cmc7 = cmc7.replace(MATCH_NON_DIGITS, '');
        if (cmc7.length !== 30) {
            return null;
        }
        return localStorage[cmc7.replace(CMC7_BANK_ACCOUNT, 'check-$1-$2-$3')];
    };

    const newCheck = (data, checkList, storage, modal) => {
        data.cmc = data.cmc.replace(MATCH_NON_DIGITS, '');

        if (checkAlreadyExists(data) || _.findIndex(storage, compare => {
            if (!compare || !compare.cmc) {
                return false;
            }
            return compare.cmc === data.cmc;
        }) !== -1) {
            toastr.warning('O cheque informado já foi cadastrado.', 'Efetue uma busca no sistema.');
            return;
        }

        const item = checkList.item('fa-times-circle-o', [
            CMC7_MASK.apply(data.cmc),
            data.expire.isValid() ? data.expire.format('DD/MM/YYYY') : '',
            data.observation || data.document,
            data.ammount ? `R$ ${data.ammount}` : 'Valor não informado'
        ]);

        data.ammount = Math.floor(numeral(data.ammount)._value * 100);

        data[CPF.isValid(data.document) ? 'cpf' : 'cnpj'] = data.document;
        delete data.document;
        data.expire = (data.expire.isValid() ? data.expire : moment().add(5, 'months')).format('YYYYMMDD');

        storage.push(data);

        item.click(() => {
            delete storage[storage.indexOf(data)];
            item.remove();
            if (storage.length <= 0)
                modal.close();
        });
    };

    const generateCustomer = data => {
        const storage = [];
        const modal = controller.call('modal');
        modal.title('Adicionar Cheques');
        modal.subtitle('Acompanhamento de Cheques');
        modal.addParagraph('Fique no controle, acompanhe todos os cheques abaixo e seja avisado caso algum deles possua ocorrências por sustação, furto ou outras fraudes.');

        const form = modal.createForm();
        const checkList = form.createList();

        newCheck(data, checkList, storage);

        newCheckWrapper = data => {
            newCheck(data, checkList, storage);
        };

        form.addSubmit('newcheck', 'Novo Cheque').click(e => {
            e.preventDefault();
            controller.call('icheques::newcheck');
        });

        form.addSubmit('checkout', 'Enviar para Monitoramento').click(e => {
            e.preventDefault();
            newCheckWrapper = null;
            controller.call('icheques::checkout', _.filter(storage, i => i));
            modal.close();
        }).addClass('credithub-button');

        modal.createActions().add('Cancelar Operação').click(e => {
            e.preventDefault();
            modal.close();
            newCheckWrapper = null;
        });
    };

    let newCheckFormAction = null;

    controller.registerCall('icheques::chequePicture::confirm', (imageData, callback) => {
        controller.confirm({
            title: 'Essa foto do seu cheque ficou realmente legal?',
            subtitle: 'Deseja prosseguir com essa imagem?',
            paragraph: 'Fotos de cheques de baixa qualidade, rasurados ou muito amassados serão descartadas.'
        },
        () => callback(imageData),
        () => controller.call('icheques::chequePicture', callback), (modal, form) => {
            $('<img />', {
                src: `data:image/jpeg;base64,${imageData}`,
                style: 'max-width: 100%; display: block; margin: 14px auto;'
            }).insertBefore(form.element());
        });
    });

    controller.registerCall('icheques::imagetocmc', (imageData, cmcValue, cpfValue, callback) => {
        /* alreadyExists */
        if (cmcValue) callback(cmcValue);
        else if (!imageData) callback();
        else controller.server.call('SELECT FROM \'ICHEQUES\'.\'IMAGECMC\'', {
            data: {
                image: imageData
            },
            dataType: 'json',
            success: data => callback(cmcValue || data.cmcValue, cpfValue || data.cpfValue),
            error: () => callback(cmcValue, cpfValue)
        });
    });

    controller.registerCall('icheques::chequePicture', (callback, force = false) => {
        if (controller.confs.isCordova || force) {
            controller.confirm({
                title: 'Vamos tirar uma foto do seu cheque?',
                subtitle: 'Com a foto do cheque podemos preencher alguns dados automaticamente.',
                paragraph: 'Tire uma foto da frente do cheque onde o mesmo não esteja amassado e/ou dobrado, cheques rasurados podem não ser reconhecidos.'
            }, () => navigator.camera.getPicture(
                (imageData) => controller.call('icheques::chequePicture::confirm', imageData, callback),
                () => controller.alert({
                    title: 'Uoh! Não conseguimos capturar a foto do cheque.',
                    subtitle: 'Talvez não tenha autorizado nosso aplicativo a utilizar a câmera de seu dispositivo',
                    paragraph: 'Não tem problema, tentaremos novamente ou você pode cancelar e cadastrar manual seu cheque.'
                }, () => controller.call('icheques::chequePicture', callback, force)), {
                    quality: 90,
                    destinationType: typeof Camera !== 'undefined' ? Camera.DestinationType.DATA_URL : null,
                }), () => callback(null));
        } else {
            callback(null);
        }
    });

    controller.registerCall('icheques::newcheck', (callback, cmcValue, cpfValue) => {
        controller.call('icheques::chequePicture', image =>
            controller.call('icheques::imagetocmc', image, cmcValue, cpfValue, (cmcValue, cpfValue) =>
                controller.call('icheques::newcheck::form', callback, cmcValue, cpfValue, image)));
    });

    controller.registerCall('icheques::newcheck::form', (callback, cmcValue = null, cpfValue = null, image = null) => {
        if (newCheckFormAction && !newCheckFormAction()) {
            return;
        }

        callback = callback || newCheckWrapper || generateCustomer;
        cpfValue = cpfValue || (cmcValue ? getCMC7Storage(cmcValue) : null);

        const modal = controller.call('modal');
        $(document).bind('keypress.newCheck', ({keyCode}) => {
            if (keyCode == KeyCode.ENTER) {
                $('input:text').filter((i, {value}) => !value).first().focus();
                return false;
            }
            return true;
        });

        modal.onClose = () => $(document).unbind('keypress.newCheck');

        modal.title('Adicionar Cheque');
        modal.subtitle('Preencha as informações abaixo do cheque.');
        modal.addParagraph('Preencha e confirme as informações, você será notificado no e-mail assim que validarmos o cheque. Se tiver um scanner de cheques você pode usá-lo agora.');

        modal.action('camera', () => controller.call('icheques::chequePicture', img => controller.call('icheques::imagetocmc', img, cmcValue, cpfValue, (cmcValue, cpfValue) => {
            image = img;
            showImage.show();
        }), true));

        const form = modal.createForm();
        var showImage = null;
        const dataCMC7 = {};
        const dataCPF = {};
        const inputCMC7 = form.addInput('CMC7', 'text', controller.confs.isPhone ? 'Impresso na parte inferior.' :
            'A seqüência impressa na parte inferior do cheque em código de barra.', dataCMC7, 'CMC7 <a href="#">(Ajuda)</a>').val(cmcValue).mask('00000000 0000000000 000000000000');
        const options = {
            onKeyPress({length}, e, field, options) {
                const masks = ['000.000.000-009', '00.000.000/0000-00'];
                const mask = (length > 14) ? masks[1] : masks[0];
                inputDocument.mask(mask, options);
            }
        };
        var inputDocument = form.addInput('CPF/CNPJ', 'text', 'CPF/CNPJ impresso no cheque.', dataCPF, 'CPF/CNPJ <a href="#">(Ajuda)</a>').mask('000.000.000-00', options).val(cpfValue || '');

        dataCMC7.label.addClass('help cmc7');
        dataCPF.label.addClass('help cmc7');

        const obj = {
            append: form.multiField(),
            labelPosition: 'before'
        };

        const inputValue = form.addInput('Valor', 'text', 'Valor', obj, 'R$').mask('000.000.000.000.000,00', {
            reverse: true
        }).addClass('money');
        obj.label.addClass('money');

        const inputExpire = form.addInput('Vencimento', 'text', 'Vencimento', obj, 'Vencimento').mask('00/00/0000');
        inputExpire.pikaday();
        const inputObservacao = form.addInput('Observação', 'text', 'Observação', {}, 'Observação');

        inputCMC7.change(() => {
            const document = getCMC7Storage(inputCMC7.val());
            if (!document) {
                return;
            }
            inputDocument.val(document);
        });

        newCheckFormAction = e => {
            if (e) {
                e.preventDefault();
            }
            const errors = [];
            const document = inputDocument.val();
            const cmc7 = inputCMC7.val();
            const expire = moment(inputExpire.val(), ['DD/MM/YYYY', 'DD/MM/YY']);

            if (inputExpire.val() && !expire.isValid()) {
                errors.push('A data do cheque não parece conferir.');
                inputExpire.addClass('error');
            } else {
                inputExpire.removeClass('error');
            }

            let cmc7Val = cmc7.replace(MATCH_NON_DIGITS, '');
            if (!/^\d{30}$/.test(cmc7Val) || !new CMC7Validator(cmc7Val).isValid()) {
                errors.push('O CMC7 do cheque não confere.');
                inputCMC7.addClass('error');
            } else {
                inputCMC7.removeClass('error');
            }

            if (!CPF.isValid(document) && !CNPJ.isValid(document)) {
                errors.push('CPF/CNPJ do cheque não confere.');
                inputDocument.addClass('error');
            } else {
                inputDocument.removeClass('error');
            }

            if (errors.length) {
                for (const i in errors) {
                    toastr.warning('Verifique o campo e tente novamente!', errors[i]);
                }
                return false;
            }

            setCMC7Document(cmc7, document);

            let finish = () => callback({
                document,
                ammount: inputValue.val(),
                expire,
                cmc: cmc7Val,
                observation: inputObservacao.val(),
                image
            });

            if (!validCheck(cmc7Val)) {
                controller.confirm({
                    icon: 'socialShare',
                    title: 'A instituição bancária informada não é coberta pelo iCheques.',
                    subtitle: 'Mesmo assim você gostaria de adicionar o cheque em sua carteira?',
                    paragraph: 'Você poderá antecipá-lo com nossos parceiros financeiros ou simplesmente administrá-lo em sua carteira.'
                }, finish);
            } else {
                finish();
            }

            modal.close();
            newCheckFormAction = null;
            return true;
        };

        form.element().submit(newCheckFormAction);

        form.addSubmit('addcheck', 'Adicionar Cheque').addClass('strong credithub-button');

        const actions = modal.createActions();
        actions.add('Arquivo BAN ou REM').click(e => {
            e.preventDefault();
            newCheckFormAction = null;
            modal.close();
            controller.call('icheques::fidc');
        });

        showImage = actions.add('Exibir Imagem').click(e => {
            e.preventDefault();
            controller.confirm({
                title: 'Essa foto do seu cheque ficou realmente legal?',
                subtitle: 'Deseja prosseguir com essa imagem?',
                paragraph: 'Fotos de cheques de baixa qualidade, rasurados ou muito amassados serão descartadas.'
            },
            () => {},
            () => {
                image = null;
                showImage.hide();
            }, (modal, form) => {
                $('<img />', {
                    src: `data:image/jpeg;base64,${image}`,
                    style: 'max-width: 100%; display: block; margin: 14px auto;'
                }).insertBefore(form.element());
            });
        });

        if (!image) {
            showImage.hide();
        }

        actions.add('Fechar').click(e => {
            e.preventDefault();
            newCheckFormAction = null;
            modal.close();
        });
    });

    controller.registerTrigger('icheques::newcheck', 'icheques::newcheck', (cmc, callback) => {
        callback();
        controller.call('icheques::newcheck', null, cmc);
    });

    controller.registerCall('icheques::help::cmc', () => {
        const modal = controller.call('modal');
        const form = modal.createForm();

        form.element().append($('<img />').attr({
            src: '/images/icheques/cheque.svg'
        }));

        form.addSubmit('understand', 'Entendi!');
        form.element().submit(e => {
            e.preventDefault();
            modal.close();
        });
    });

};
