import {findOptimalInsertionRange} from '@ckeditor/ckeditor5-widget/src/utils';
import {mimeTypes} from './mimeTypes';

/* global fetch, File */

/**
 * Creates a regular expression used to test for files.
 *
 * @param {Array.<String>} types
 * @returns {RegExp}
 */
export function createFileTypeRegExp( types ) {
	// Sanitize the MIME type name which may include: "+", "-" or ".".
	const regExpSafeNames = Object.values(mimeTypes).map( type => type.replace( '+', '\\+' ) );
	return new RegExp( `^application\\/(${ regExpSafeNames.join( '|' ) })$` );
}

/**
 * @param {module:engine/view/element~Element} link File whose source to fetch.
 * @returns {Promise.<File>} A promise which resolves when an image source is fetched and converted to a `File` instance.
 * It resolves with a `File` object. If there were any errors during file processing, the promise will be rejected.
 */
export function fetchLocalFile( link ) {
	return new Promise( ( resolve, reject ) => {
		const linkHref = link.getAttribute( 'href' );

		// Fetch works asynchronously and so does not block browser UI when processing data.
		fetch( linkHref )
			.then( resource => resource.blob() )
			.then( blob => {
				const mimeType = getFileMimeType( blob, linkHref );
				const ext = mimeType.replace( 'file/', '' );
				const filename = `file.${ ext }`;
				const file = createFileFromBlob( blob, filename, mimeType );

				file ? resolve( file ) : reject();
			} )
			.catch( reject );
	} );
}

/**
 * @param {module:engine/view/node~Node} node The node to check.
 * @returns {Boolean}
 */
export function isLocalFile( node ) {
	if ( !node.is( 'element', 'a' ) || !node.getAttribute( 'href' ) ) {
		return false;
	}

	return node.getAttribute( 'href' );
}


function getFileMimeType( blob, src ) {
	if ( blob.type ) {
		return blob.type;
	} else if ( src.match( /data:(image\/\w+);base64/ ) ) {
		return src.match( /data:(image\/\w+);base64/ )[ 1 ].toLowerCase();
	} else {
		throw new Error('Could not retrieve mime type for file.');
	}
}

// Creates a `File` instance from the given `Blob` instance using the specified file name.
//
// @param {Blob} blob The `Blob` instance from which the file will be created.
// @param {String} filename The file name used during the file creation.
// @param {String} mimeType The file MIME type.
// @returns {File|null} The `File` instance created from the given blob or `null` if `File API` is not available.
function createFileFromBlob( blob, filename, mimeType ) {
	try {
		return new File( [ blob ], filename, { type: mimeType } );
	} catch ( err ) {
		// Edge does not support `File` constructor ATM, see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9551546/.
		// However, the `File` function is present (so cannot be checked with `!window.File` or `typeof File === 'function'`), but
		// calling it with `new File( ... )` throws an error. This try-catch prevents that. Also when the function will
		// be implemented correctly in Edge the code will start working without any changes (see #247).
		return null;
	}
}

export function insertFileLink(writer, model, attributes = {}, file, editor) {
    try {
		const selection = model.document.selection;
	
        if (selection.isCollapsed) {
			const selection = editor.model.document.selection;

			// Get the cursor element
			const insertAtCursor = selection.getFirstPosition();
			const textNode = insertAtCursor?.textNode;
			if(textNode?.getAttribute?.("linkHref")){
				writer.setAttribute( 'linkHref', attributes?.linkHref || '', textNode);
				writer.setAttribute( 'uploadId', attributes?.uploadId || '', textNode);
				writer.setSelection(textNode, 'on');
			}else{
				const linkedText = writer.createText(file.name, attributes);
				model.insertContent(linkedText, insertAtCursor);
				if (linkedText.parent) {
					writer.setSelection(linkedText, 'on');
				}
			}
	
			
        } else {
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
				if (_isRangeToUpdate( range, allowedRanges ) ) {
					rangesToUpdate.push( range );
				}
			}

			for ( const range of rangesToUpdate ) {
				writer.setAttribute( 'linkHref', attributes?.linkHref || '', range );
				writer.setAttribute( 'uploadId', attributes?.uploadId || '', range );
			}

			writer.setSelection(rangesToUpdate?.[0], 'on');


        }
    } catch (error) {
        // console.log(error, "ckeditor ====> errorerrorerrorerror");
    }
}



function _isRangeToUpdate( range, allowedRanges ) {
	for ( const allowedRange of allowedRanges ) {
		// A range is inside an element that will have the `linkHref` attribute. Do not modify its nodes.
		if ( allowedRange.containsRange( range ) ) {
			return false;
		}
	}

	return true;
}


function findLinkElementAncestor( position ) {
	return position.getAncestors().find( ( ancestor ) => isLinkElement( ancestor ) ) || null;
}


export function isLinkElement( node ) {
	return node.is( 'attributeElement' ) && !!node.getCustomProperty( 'link' );
}
