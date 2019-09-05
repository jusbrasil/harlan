import _ from 'underscore';
import Color from 'color';
import randomColor from 'randomcolor';
import ChartJS from 'chart.js';
import buildURL from 'build-url';

harlan.addPlugin(controller => {

    controller.endpoint.myIChequesAccountOverview = 'SELECT FROM \'ICHEQUESREPORT\'.\'REPORT\'';

    const colorPattern = {
        querys: Color('#ff6a33'),
        push: Color('#33ff6a'),
        pushRemoved: Color('#ffd033'),
        pushCreated: Color('#33c8ff'),
    };

    controller.registerCall('myIChequesAccountOverview::dataset', responses => {
        const datasets = {};
        const labels = _.map(responses, item => {
            $(item).children('report').each((idx, value) => {
                const reader = $(value);
                const id = reader.children('id').text();

                if (!datasets[id]) {
                    const color = colorPattern[id] || new Color(randomColor({
                        luminosity: 'bright',
                        format: 'rgb' // e.g. 'rgb(225,200,20)'
                    }));

                    const fillColor = new Color(color.object()).fade(0.7);

                    datasets[id] = {
                        color,
                        fillColor: fillColor.hsl().string(),
                        strokeColor: color.string(),
                        pointColor: color.string(),
                        pointStrokeColor: color.light() ? '#fff' : '#000',
                        pointHighlightFill: color.light() ? '#fff' : '#000',
                        pointHighlightStroke: color.string(),
                        id: reader.children('id').text(),
                        label: reader.children('name').text(),
                        description: reader.children('description').text(),
                        data: []
                    };
                }
                datasets[id].data.push(parseInt(reader.children('value').text()));
            });
            return $('begin', item).text();
        });
        return {
            labels,
            datasets: _.values(datasets)
        };
    });

    controller.registerCall('myIChequesAccountOverview::filter', (username, report, callback, closeable = false) => {
        const modal = controller.call('modal');
        modal.title('Filtros do Relatório');
        modal.subtitle('Modifique o Relatório');
        modal.paragraph('Defina abaixo as características que deseja que sejam usadas para a geração do relatório de consumo.');

        const form = modal.createForm();
        const dateStart = form.addInput('dateStart', 'text', 'dd/mm/yyyy', null, 'De', moment().subtract(2, 'months').format('DD/MM/YYYY')).pikaday();
        const dateEnd = form.addInput('dateEnd', 'text', 'dd/mm/yyyy', null, 'Até', moment().format('DD/MM/YYYY')).pikaday();

        const period = form.addSelect('dd', 'period', {
            P1W: 'Semanal',
            P1D: 'Diário',
            P1M: 'Mensal'
        }, null, 'Intervalo');

        form.element().submit(e => {
            e.preventDefault();
            modal.close();
            controller.call('myIChequesAccountOverview', callback, report.element(),
                username,
                /^\d{2}\/\d{2}\/\d{4}$/.test(dateStart.val()) ? dateStart.val() : null,
                /^\d{2}\/\d{2}\/\d{4}$/.test(dateEnd.val()) ? dateEnd.val() : null,
                period.val(), 'replaceWith', closeable);
        });
        form.addSubmit('submit', 'Filtrar');
        modal.createActions().cancel();
    });

    controller.registerCall('myIChequesAccountOverview::download', (ajaxQuery, labels) => {
        let download = report => e => {
            e.preventDefault();
            window.location.assign(buildURL(bipbop.webserviceAddress, {
                queryParams: _.pick(Object.assign({}, ajaxQuery, {
                    q: controller.endpoint.myIChequesAccountOverview,
                    download: 'true',
                    apiKey: controller.server.apiKey(),
                    report
                }), x => !!x)
            }));
        };

        let modal = controller.call('modal');

        modal.title('Selecione o relatório que gostaria de baixar.');
        modal.subtitle('Faça o download do relatório que deseja.');
        modal.paragraph('Selecione o relatório que deseja para começar o download em CSV.');

        let list = modal.createForm().createList();
        for (let item of labels) {
            list.add('fa-cloud-download', `${item.label} - ${item.description}`).click(download(item.id));
        }

        modal.createActions().cancel();
    });

    controller.registerCall('myIChequesAccountOverview', (
        callback,
        element,
        username,
        start,
        end,
        interval = 'P1W',
        method = 'append',
        closeable = false,
        contractType = null
    ) => {
        let ajaxQuery = {
            username,
            period: interval,
            dateStart: start || moment().subtract(2, 'months').startOf('week').format('DD/MM/YYYY'),
            dateEnd: end,
            contractType
        };
        controller.serverCommunication.call(controller.endpoint.myIChequesAccountOverview,
            controller.call('loader::ajax', controller.call('error::ajax', {
                cache: true,
                data: ajaxQuery,
                success(response) {
                    console.log('the response: ')
                    console.log(response);
                    const dataset = controller.call('myIChequesAccountOverview::dataset', $('BPQL > body > node', response));
                    const report = controller.call('report',
                        'Relatório de Consumo',
                        'Visualize informações sobre o uso da API',
                        'Com o recurso de relatório você consegue identificar os padrões de consumo do usuário, ' +
                        'identificando dias em que é mais ou menos intensivo. Pode ser utilizado também para geração ' +
                        'de faturas para clientes que não possuem esse processo automatizado.',
                        closeable);
                    const canvas = report.canvasGrid(500, 250);
                    (element || $('.app-content'))[method || 'append'](report.element());
                    for (const i in dataset.datasets) {
                        report.labelGrid(dataset.datasets[i].label).css({
                            'background-color': dataset.datasets[i].strokeColor,
                            color: dataset.datasets[i].color.light() ? '#000' : '#fff'
                        });
                    }

                    
                    report.table();
                    report.grid();

                    report.action('fa-cloud-download', () => {
                        controller.call('myIChequesAccountOverview::download', ajaxQuery, dataset.datasets);
                    });

                    report.action('fa-filter', () => {
                        controller.call('myIChequesAccountOverview::filter', username, report, callback, closeable);
                    });
                    callback(report);

                    const showInterval = setInterval(() => {
                        if (!document.contains(canvas) || !$(canvas).is(':visible')) {
                            return;
                        }
                        clearInterval(showInterval);
                        new ChartJS(canvas.getContext('2d')).Line(dataset);
                    }, 200);
                }
            })));
    });

    controller.call('myIChequesAccountOverview', graph => {
        graph.gamification('levelUp');
    });

});
