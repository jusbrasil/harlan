import {
    Harmonizer
} from 'color-harmony';
import ChartJS from 'chart.js';
import _ from 'underscore';
import Color from 'color';

module.exports = controller => {

    let harmonizer = new Harmonizer();

    function numeralUS(str) {
        const locale = numeral.locale();
        numeral.locale('en');
        const result = numeral(str || '0');
        numeral.locale(locale);
        return result;
    }

    controller.registerCall('admin::tagsViewer', (data = {}) => {
        controller.server.call('SELECT FROM \'BIPBOPCOMPANYSREPORT\'.\'TAGS\'', {
            dataType: 'json',
            data,
            success: dataset => {
                if (!dataset.length) return;

                const report = controller.call('report',
                    'Cadastro de Tags em Usuários',
                    'Lista das tags cadastradas nos usuários.', null, true);

                const colors = harmonizer.harmonize('#cdfd9f', [...Array(dataset.length).keys()].map(i => i * 10));
                const colorsHightlight = harmonizer.harmonize('#c0fc86', [...Array(dataset.length).keys()].map(i => i * 10));

                controller.trigger('admin::tagsViewer', report);
                report.paragraph('Através do gráfico ao lado pode se ver as tags comerciais mais utilizadas em sua aplicação. O usuário ou o administador podem editar as tags através dos dados cadastrais.');
                $('.app-content').append(report.element());

                report.newContent();

                const groupData = _.values(_.groupBy(dataset, ({_id}) => _id || null));

                const reduceData = _.sortBy(_.map(groupData, group => _.reduce(group, ({_id, total}, o) => ({
                    _id,
                    total: total + o.total,
                }))), 'total');

                const charData = _.map(reduceData, ({_id, total}, i) => ({
                    tag: _id,
                    label: _id || 'Não preenchido',
                    value: total,
                    color: colors[i],
                    highlight: colorsHightlight[i]
                }));
                const reducedDataset = reduceDataset(charData);
                const canvas = report.canvas(250, 250);

                const interval = setInterval(() => {
                    if (document.contains(canvas) && $(canvas).is(':visible')) {
                        clearInterval(interval);
                        new ChartJS(canvas.getContext('2d')).Doughnut(reducedDataset);
                    }
                }, 1000);

                charData.forEach(({tag, label, value}, i) => {
                    if (!tag) {
                        return;
                    }
                    report.label(`${label} : ${numeralUS(value).format('0,0')}`).css({
                        'background-color': colors[i],
                        color: new Color(colors[i]).light() ? '#000' : '#fff',
                        cursor: 'pointer'
                    }).click(e => {
                        e.preventDefault();
                        controller.call('admin::openCompanys', report, {
                            tag
                        });
                    });
                });
            }
        });
    });

    controller.registerCall('admin::commercialReference', (data = {}) => {
        controller.server.call(controller.endpoint.commercialReferenceOverview, {
            dataType: 'json',
            data,
            success: dataset => {
                const report = controller.call('report',
                    'Referências Comerciais',
                    'Lista das referências comerciais.', null, true);

                const colors = harmonizer.harmonize('#cdfd9f', [...Array(dataset.length).keys()].map(i => i * 10));
                const colorsHightlight = harmonizer.harmonize('#c0fc86', [...Array(dataset.length).keys()].map(i => i * 10));

                controller.trigger('admin::commercialReference', report);
                report.paragraph('Através do gráfico ao lado pode se ver quem são as maiores referências comerciais para sua aplicação. O usuário ou o administador podem editar a referência comercial através dos dados cadastrais.');
                $('.app-content').append(report.element());

                report.newContent();

                const groupData = _.values(_.groupBy(dataset, ({_id}) => _id || null));

                const reduceData = _.sortBy(_.map(groupData, group => _.reduce(group, ({_id, total}, o) => ({
                    _id,
                    total: total + o.total,
                }))), 'total');

                const charData = _.map(reduceData, ({_id, total}, i) => ({
                    commercialReference: _id,
                    label: _id || 'Não preenchido',
                    value: total,
                    color: colors[i],
                    highlight: colorsHightlight[i]
                }));
                const reducedDataset = reduceDataset(charData);
                const canvas = report.canvas(250, 250);

                const interval = setInterval(() => {
                    if (document.contains(canvas) && $(canvas).is(':visible')) {
                        clearInterval(interval);
                        new ChartJS(canvas.getContext('2d')).Doughnut(reducedDataset);
                    }
                }, 1000);

                charData.forEach(({commercialReference, label, value}, i) => {
                    if (!commercialReference) {
                        return;
                    }
                    report.label(`${label} : ${numeral(value).format('0,0')}`).css({
                        'background-color': colors[i],
                        color: new Color(colors[i]).light() ? '#000' : '#fff',
                        cursor: 'pointer'
                    }).click(e => {
                        e.preventDefault();
                        controller.call('admin::openCompanys', report, {
                            commercialReference
                        });
                    });
                });
            }
        });
    });

    /**
     * Agrupa resultados com menos de 5% evitando problemas no gráfico
     * @param {array} data
     * @returns {array}
     */
    var reduceDataset = (dataArgument) => {
        let data = jQuery.extend(true, {}, dataArgument);
        let sum = _.reduce(data, ({value}, o) => ({
            value: value + o.value,
        }));

        sum = sum && sum.value ? sum.value : 0;

        let idx = 1;

        return _.map(_.values(_.groupBy(data, ({value}) => {
            if (value < sum * 0.05) {
                return 0;
            }
            return idx++;
        })), value => _.reduce(value, (a, b) => {
            a.value += b.value;
            a.color = '#93A7D8';
            a.highlight = new Color('#93A7D8').lighten(0.1).hsl().string();
            a.label = 'Outros';
            return a;
        }));

    };
};
