import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import Command from '@ckeditor/ckeditor5-core/src/command';
import { insertFileLink, isFileAllowed } from './utils';
import { findAttributeRange } from 'ckeditor5/src/typing';

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
	execute( options, manualDecoratorIds = {} ) {
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

		const truthyManualDecorators = [];
		const falsyManualDecorators = [];

		for ( const name in manualDecoratorIds ) {
			if ( manualDecoratorIds[ name ] ) {
				truthyManualDecorators.push( name );
			} else {
				falsyManualDecorators.push( name );
			}
		}
		
		if (selection.isCollapsed) {
			// Selection is collapsed (no text selected)
			return;
		}
		model.change( writer => {
		
		// If selection has non-collapsed ranges, we change attribute on nodes inside those ranges
				// omitting nodes where the `linkHref` attribute is disallowed.
				const ranges = model.schema.getValidRanges( selection.getRanges(), 'linkHref' );

				// But for the first, check whether the `linkHref` attribute is allowed on selected blocks (e.g. the "image" element).
				const allowedRanges = [];

				for ( const element of selection.getSelectedBlocks() ) {
					if ( model.schema.checkAttribute( element, 'linkHref' ) ) {
						allowedRanges.push( writer.createRangeOn( element ) );
					}
				}

				// Ranges that accept the `linkHref` attribute. Since we will iterate over `allowedRanges`, let's clone it.
				const rangesToUpdate = allowedRanges.slice();

				// For all selection ranges we want to check whether given range is inside an element that accepts the `linkHref` attribute.
				// If so, we don't want to propagate applying the attribute to its children.
				for ( const range of ranges ) {
					if ( this._isRangeToUpdate( range, allowedRanges ) ) {
						rangesToUpdate.push( range );
					}
				}

				for ( const range of rangesToUpdate ) {
					writer.setAttribute( 'linkHref', 'https://chat.openai.com/c/1106aad2-dff5-48c6-936e-6061b16e222e', range );

					truthyManualDecorators.forEach( item => {
						writer.setAttribute( item, true, range );
					} );

					falsyManualDecorators.forEach( item => {
						writer.removeAttribute( item, range );
					} );
				}
			})
	
		// const link = model.builder.create('link', { href: 'https://chat.openai.com/c/1106aad2-dff5-48c6-936e-6061b16e222e' });
		
		// model.change(writer => {
		// 	// Replace selected text with the link
		// 	writer.insertText(selectedText, link);
		// });
	}

	_isRangeToUpdate( range, allowedRanges ) {
		for ( const allowedRange of allowedRanges ) {
			// A range is inside an element that will have the `linkHref` attribute. Do not modify its nodes.
			if ( allowedRange.containsRange( range ) ) {
				return false;
			}
		}

		return true;
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
