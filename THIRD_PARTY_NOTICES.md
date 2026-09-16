# Third-party notices

GrapePaper is licensed under MIT. Dependencies retain their respective licenses.

## PDF.js

The PDF reader uses Mozilla's `pdfjs-dist`, distributed under the Apache License 2.0. Text-layer layout declarations in `src/reader/PdfReader.css` are adapted from PDF.js viewer styles.

- Copyright Mozilla Foundation and PDF.js contributors.
- [PDF.js source and license](https://github.com/mozilla/pdf.js/blob/master/LICENSE)
- Installed dependency license: `node_modules/pdfjs-dist/LICENSE`

The bundled PDF.js worker and library retain their upstream license headers. Generated production bundles should be distributed with the upstream Apache-2.0 license text; the build copies it into `dist/PDFJS-LICENSE.txt`.
