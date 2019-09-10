module.exports = controller => {

    let timeout = null;

    /**
     * Autocomplete
     * @param {JQuery<HTMLElement>} input
     * @returns {module.exports = .autocomplete}
     */
    const Autocomplete = function (input) {
        const inputContainer = $('<div />').addClass('autocomplete');
        /* Input Element First */

        input.replaceWith(inputContainer);
        inputContainer.append(input);

        input.attr('autocomplete', 'off');
        const options = $('<ul />');
        inputContainer.append(options);
        let position = null;

        input.keydown(function({keyCode, which}) {
            const code = keyCode || which;
            if (code === 27) {
                this.empty();
                return;
            }

            const items = options.find('li');

            if (!(code === 13 || code === 38 || code === 40))
                return;

            if (!items.length) {
                return;
            }

            if (which === 13) {
                if (position) {
                    /* Simulate a click (shame ;(* )*/
                    items.eq(position % items.length).removeClass('selected').click();
                }
                return;
            }

            if (position === null) {
                position = 0;
            } else {
                items.eq(position % items.length).removeClass('selected');
                position += (which === 38 ? -1 : +1);
            }

            items.eq(position % items.length).addClass('selected');

        });

        input.blur(() => {
            timeout = setTimeout(() => {
                options.removeClass('active');
            }, controller.confs.hideAutocomplete);
        }).focus(() => {
            if (timeout)
                clearTimeout(timeout);
            options.addClass('active');
        });

        this.setIcon = function (i) {
            input.after($('<i />').addClass('fa input-icon').addClass(i));
            return this;
        };

        this.input = () => input;

        const addOption = prepend => {
            const item = $('<li />');
            const fnc  = prepend ? 'prepend' : 'append';
            options[fnc](item);
            return item;
        };

        this.empty = () => {
            position = null;
            options.empty();
        };

        this.item = (title, subtitle, description, html, prepend) => {
            const item = addOption(prepend);

            if (title)
                item.append($('<div />').text(title).addClass('item-title'));

            if (subtitle)
                item.append($('<div />').text(subtitle).addClass('item-subtitle'));

            if (description)
                item.append($('<div />').text(description).addClass('item-description'));

            if (html)
                item.append(html);

            return item;
        };

        return this;
    };

    /**
     * Autocomplete de um formulário
     */
    controller.registerCall('autocomplete', input => new Autocomplete(input));

};
