import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import Command from '@ckeditor/ckeditor5-core/src/command';
import { insertFileLink, isFileAllowed } from './utils';

export default class FileUploadCommand extends Command {
	/**
	 * @inheritDoc
	 */
	refresh() {
		this.isEnabled = true;
	}

	/**
	 * Executes the command.
	 *
	 * @fires execute
	 * @param {Object} options Options for the executed command.
	 * @param {File|Array.<File>} options.file The file or an array of files to upload.
	 */
	execute( options ) {
		//const editor = this.editor;
		// const model = editor.model;
		// const fileRepository = editor.plugins.get( FileRepository );

		// model.change( writer => {
		// 	const filesToUpload = options.file;
		// 	for ( const file of filesToUpload ) {
		// 		uploadFile( writer, model, fileRepository, file, editor);
		// 	}
		// } );

		const editor = this.editor;
		const model = editor.model;
		const selection = model.document.selection;
		
		if (selection.isCollapsed) {
			// Selection is collapsed (no text selected)
			return;
		}
		
		const range = selection.getFirstRange();
		const selectedText = Array.from(range.getWalker()).map(item => item.data).join('');
		
		editor.model.change(writer => {
			const insertPosition = range.start;
			const linkElement = writer.createElement('a');
			writer.setAttribute('href', 'https://chat.openai.com/c/0b90c92a-81d2-4c2f-8aba-0e1f3e33ab06', linkElement);
			
			// Check if the range is non-flat
			if (!range.isFlat) {
				// If the range is non-flat, flatten it
				const flatRanges = writer.flattenRange(range);
				// Wrap each flat range
				flatRanges.forEach(flatRange => {
					writer.wrap(linkElement, flatRange);
				});
			} else {
				// If the range is already flat, simply wrap it
				writer.wrap(linkElement, range);
			}
		});
	
		// const link = model.builder.create('link', { href: 'https://chat.openai.com/c/1106aad2-dff5-48c6-936e-6061b16e222e' });
		
		// model.change(writer => {
		// 	// Replace selected text with the link
		// 	writer.insertText(selectedText, link);
		// });
	}
}

/**
 * 	Handles uploading single file.
 *
 *	@param {module:engine/model/writer~writer} writer
 *	@param {module:engine/model/model~Model} model
 *	@param {File} file
 */
function uploadFile( writer, model, fileRepository, file, editor ) {
	const loader = fileRepository.createLoader( file );

	// Do not throw when upload adapter is not set. FileRepository will log an error anyway.
	if ( !loader ) {
		return;
	}

	insertFileLink( writer, model, {linkHref: "", uploadId: loader.id }, file, editor );
}
