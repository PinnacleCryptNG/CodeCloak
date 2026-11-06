# vuln-path

**FICTIONAL — for hackathon demo only.** Not real code from any product.

Planted bug: `readUpload` / `saveUpload` pass the user-supplied `filename` straight into `path.join(UPLOAD_DIR, filename)`, so a name starting with `../` escapes the uploads folder (read and overwrite any file the process can reach). Fix: `path.basename`, then `path.resolve` and check the result still starts with `UPLOAD_DIR + path.sep`.
