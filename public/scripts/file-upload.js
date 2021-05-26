FilePond.registerPlugin(FilePondPluginImagePreview, FilePondPluginImageResize, FilePondPluginFileEncode);

FilePond.setOptions({
	stylePanelAspectRatio: 300/400,
	imageResizeTargetWidth: 4000,
	imageResizeTargetHeight: 3000,
});

FilePond.parse(document.body);
