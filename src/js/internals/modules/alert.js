module.exports = controller => {

    controller.registerCall('confirm', controller.confirm = (
        parameters = {},
        onConfirm,
        onCancel,
        formTrick,
        useCheckbox,
        validateCallback
    ) => {
        const modal = controller.call('modal');
        modal.gamification(parameters.icon || 'hammer');
        modal.title(parameters.title || 'Você confirma essa operação?');
        modal.subtitle(parameters.subtitle || 'Uma vez confirmado você não poderá desfazer esta operação.');
        if (parameters.paragraph) {
            modal.addParagraph(parameters.paragraph);
        }

        const form = modal.createForm();
        const actions = modal.createActions();
        if (formTrick) formTrick(modal, form, actions);

        let checkbox;

        form.element().submit(e => {
            e.preventDefault();
            if (checkbox && !checkbox[1].is(':checked')) {
                checkbox[0].addClass('error shake shake-constant');
                setTimeout(() => checkbox[0].removeClass('shake shake-constant'), 2500);
                return;
            }
            if (validateCallback && !validateCallback()) {
                return;
            }
            modal.close();
            if (onConfirm) {
                onConfirm();
            }
        });

        form.addSubmit('continue', parameters.confirmText || controller.i18n.system.confirm());
        checkbox = useCheckbox ? form.addCheckbox('confirm', 'Eu <strong>aceito as condições</strong> para continuar.') : null;

        actions.add(parameters.cancelText || controller.i18n.system.cancel()).click(e => {
            e.preventDefault();
            if (onCancel)
                onCancel();
            modal.close();
        });

        return {
            actions,
            modal,
            form
        };
    });

    controller.registerCall('alert', controller.alert = (parameters = {}, action) => {
        const modal = controller.call('modal');
        modal.gamification(parameters.icon || 'fail');
        modal.title(parameters.title || 'Atenção!');
        modal.subtitle(parameters.subtitle || 'Os campos preenchidos não conferem, tente novamente.');
        if (parameters.paragraph) {
            modal.addParagraph(parameters.paragraph);
        }

        const form = modal.createForm();
        form.cancelButton(controller.i18n.system.ok() || parameters.okText, () => {
            if (action) {
                action();
            }
            modal.close();
        });

        return {
            modal,
            form
        };
    });
};
