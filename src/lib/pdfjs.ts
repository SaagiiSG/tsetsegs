import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite handles ?url
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
