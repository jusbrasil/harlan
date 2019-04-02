import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';

module.exports = controller => {
    const dropzone = $('<div />').addClass('dropzone');

    let oppTimeout;

    const showDropzone = () => {
        clearTimeout(oppTimeout);
        dropzone.addClass('show');
    };

    const hideDropzone = () => {
        clearTimeout(oppTimeout);
        dropzone.removeClass('show');
    };

    function allowDrag(e) {
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
    }

    function handleDrop(e) {
        e.preventDefault();
        hideDropzone();

        e.preventDefault();
        const dataTransfers = Array.from(get(e, 'dataTransfer.items', [])).filter(({ kind }) => kind === 'file');
        const files = Array.from(get(e, 'dataTransfer.files', []));
        controller.trigger('dragdrop', { dataTransfers, files });
    }

    controller.registerBootstrap('dropzone', callback => {
        callback();
        $('.app').prepend(dropzone);

        document.addEventListener('drop', handleDrop);
        document.addEventListener('dragover', allowDrag);
        document.addEventListener('dragenter', () => {
            oppTimeout = setTimeout(() => showDropzone(), 1000);
            oppTimeout = setTimeout(() => hideDropzone(), 5000);
        });
        document.addEventListener('dragleave', () => {
            oppTimeout = setTimeout(() => hideDropzone(), 5000);
        });
    });
};