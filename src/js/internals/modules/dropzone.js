import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';

module.exports = controller => {
    const dropzone = $('<div />').addClass('dropzone');
    const dropzoneElement = dropzone.get(0);

    let hideTimeout;
    const showDropzone = () => {
        clearTimeout(hideTimeout);
        dropzone.addClass('show');
    };

    const hideDropzone = () => {
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
        document.addEventListener('dragenter', showDropzone);
        document.addEventListener('dragleave', () => {
            hideTimeout = setTimeout(() => hideDropzone(), 5000);
        });
    });
};