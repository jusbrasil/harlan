import sprintf from 'sprintf';

module.exports = controller => {

    /**
     * Atualiza a barra de progresso
     */
    controller.registerCall('progress::update', (inst, progress) => {
        progress = Math.abs(progress) * 100;
        const percProgress = sprintf('%d%%', progress > 100 ? 100 : (Number.isNaN(progress) ? 0 : progress));
        inst.progressText.text(percProgress);
        inst.progressBar.css('width', percProgress);
        return inst;
    });

    /**
     * Desenvolve uma barra de progresso
     */
    controller.registerCall('progress::init', initProgress => {
        const content = {
            element: $('<div />').addClass('app-progress'),
            progressBar: $('<div />').addClass('perc'),
            progressText: $('<span />').addClass('progress')
        };

        content.element
            .append(content.progressBar)
            .append(content.progressText);

        controller.call('progress::update', content, initProgress || 0);

        return content;
    });

    controller.registerCall('progress::ui::noblock', () => {
        let body = $('body');
        let radialProject = controller.interface.widgets.radialProject(body, 0);
        let position = [40, 40];
        radialProject.element.css({
            position: 'fixed',
            left: 40,
            bottom: 40,
            cursor: 'move',
            'user-select': 'none',
            clip: 'auto',
            opacity: 0.9
        }).mousedown(() => {
            let lastPosition = null;
            body.bind('mousemove.radialProject', e => {
                if (lastPosition) {
                    position[0] += lastPosition.pageX - e.pageX;
                    position[1] += lastPosition.pageY - e.pageY;
                    radialProject.element.css({
                        right: position[0],
                        bottom: position[1],
                    });
                }
                lastPosition = e;
            });
            body.one('mouseup', () => body.unbind('mousemove.radialProject'));
        });
        return radialProject;
    });

};
