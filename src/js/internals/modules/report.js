import gamificationIcons from './data/gamification-icons';

import Form from './lib/form';

module.exports = controller => {

    const ReportModel = function(closeable) {
        const universalContainer = $('<div />');
        const elementNews = $('<div />').addClass('report');
        const elementContainer = $('<div />').addClass('container');
        const elementActions = $('<ul />').addClass('r-actions');
        let elementContent = $('<div />').addClass('content');
        const elementResults = $('<div />').addClass('results');
        let elementOpen = null;
        let elementRow = $('<div />').addClass('mdl-grid');
        let elementCol = $('<div />').addClass('mdl-cell mdl-cell--6-col left-col');
        let elementColRight = $('<div />').addClass('mdl-cell mdl-cell--6-col right-col');;

        universalContainer.append(elementNews.append(elementContainer
            .append(elementActions)
            .append(elementContent))
            .append(elementResults));

        const buttonElement = () => {
            if (!elementOpen) {
                elementOpen = $('<div />').addClass('open');
                elementContent.append(elementOpen);
            }
            return elementOpen;
        };

        this.newContent = () => {
            elementContent = $('<div />').addClass('content');
            elementContainer.prepend(elementContent);
            return this;
        };

        this.title = title => {
            elementContent.append($('<h2 />').text(title));
            return this;
        };

        this.subtitle = subtitle => {
            elementContent.append($('<h3 />').text(subtitle));
            return this;
        };

        this.labelGrid = content => {
            const span = $('<span />').addClass('label').text(content);
            elementCol.append(span);
            return span;
        };

        this.canvasGrid = (width, height) => {
            width = width || 250;
            height = height || 250;
            const canvas = $('<canvas />').attr({
                width,
                height
            }).addClass('chart');
            elementCol.append(canvas);
            return canvas.get(0);
        };

        this.colRight = content => {
            const right = '';
        }

        this.grid = () => {
            elementRow.append(elementCol);
            elementRow.append(elementColRight);
            elementContent.append(elementRow)

            return elementRow;
        }

        this.table = content => {
            let newRow = $('<div />').addClass('mdl-grid');
            const table = `
            
                <table class='mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp'>
                    <thead>
                        <tr>
                            <th colspan="3" class="mdl-data-table__cell--non-numeric">Resumo do mês atual</th>
                        </tr>
                    </thead>
                    <thead>
                        <tr>
                            <th class="mdl-data-table__cell--non-numeric">Cheques Consultados</th>
                            <th class="mdl-data-table__cell--non-numeric">Veículos Consultados</th>
                            <th class="mdl-data-table__cell--non-numeric">CPF Consultados</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="mdl-data-table__cell--non-numeric">4</td>
                            <td class="mdl-data-table__cell--non-numeric">5</td>
                            <td class="mdl-data-table__cell--non-numeric">6</td>
                        </tr>
                    </tbody>
                </table>`
            
            const table2 = `
                <table class='mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp' style="margin-top: 10px">
                    <thead>
                        <tr>
                            <th colspan="3" class="mdl-data-table__cell--non-numeric">Resumo do mês anterior</th>
                        </tr>
                    </thead>
                    <thead>
                        <tr>
                            <th class="mdl-data-table__cell--non-numeric">Cheques Consultados</th>
                            <th class="mdl-data-table__cell--non-numeric">Veículos Consultados</th>
                            <th class="mdl-data-table__cell--non-numeric">CPF Consultados</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="mdl-data-table__cell--non-numeric">4</td>
                            <td class="mdl-data-table__cell--non-numeric">5</td>
                            <td class="mdl-data-table__cell--non-numeric">6</td>
                        </tr>
                    </tbody>
                </table>`

            newRow.append(table);
            newRow.append(table2);
            
            elementColRight.append(newRow);
        }

        this.label = content => {
            const span = $('<span />').addClass('label').text(content);
            elementContent.append(span);
            return span;
        };

        this.canvas = (width, height) => {
            width = width || 250;
            height = height || 250;
            const canvas = $('<canvas />').attr({
                width,
                height
            }).addClass('chart');
            elementContent.append(canvas);
            return canvas.get(0);
        };

        this.markers = () => {
            let list = $('<ul />').addClass('markers');
            elementContent.append(list);
            return (icon, text, action) => {
                let item;
                list.append(item = $('<li />').text(text).prepend($('<i />')
                    .addClass('fa')
                    .addClass(icon)).click(action));
                return item;
            };
        };

        this.gamification = type => {
            this.newContent();
            const icon = $('<i />')
                .addClass(gamificationIcons[type] || type)
                .addClass('gamification');
            elementContent.append(icon).addClass('container-gamification');
            return icon;
        };

        this.paragraph = text => {
            const p = $('<p />').html(text);
            elementContent.append(p);
            return p;
        };

        this.timeline = () => {
            const timeline = controller.call('timeline');
            elementContent.append(timeline.element());
            return timeline;
        };

        this.form = controller => new Form({
            element: this.content,
            close: this.close
        }, controller);

        this.button = (name, action) => {
            const button = $('<button />').text(name).click(e => {
                e.preventDefault();
                action();
            }).addClass('button');
            buttonElement().append(button);
            return button;
        };

        this.content = () => elementContent;

        this.element = () => universalContainer;

        this.newAction = (icon, action, title = null) => {
            elementActions.prepend($('<li />').append($('<i />').addClass(`fa ${icon}`)).click(e => {
                e.preventDefault();
                action();
            }).attr({title}));
            return this;
        };

        this.results = () => elementResults;

        this.result = () => {
            const result = controller.call('result');
            elementResults.prepend(result.element());
            return result;
        };

        this.action = this.newAction;

        this.close = () => {
            if (this.onClose) {
                this.onClose();
            }
            universalContainer.remove();
        };

        if (typeof closeable === 'undefined' || closeable) {
            /* closeable */
            this.newAction('fa-times', () => {
                this.close();
            });
        }

        return this;
    };

    controller.registerCall('report', (title, subtitle, paragraph, closeable) => {
        const model = new ReportModel(closeable);
        if (title) {
            model.title(title);
        }

        if (subtitle) {
            model.subtitle(subtitle);
        }

        if (paragraph) {
            model.paragraph(paragraph);
        }

        return model;
    });

};
