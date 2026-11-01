const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const REPORTS_DIR = path.join(__dirname, '../reports');

const CSS_STYLES = `
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 11pt;
    padding: 0;
    margin: 0;
  }
  h1 {
    font-size: 22pt;
    color: #0f172a;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 8px;
    margin-top: 0;
  }
  h2 {
    font-size: 16pt;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 24px;
  }
  h3 {
    font-size: 13pt;
    color: #334155;
    margin-top: 18px;
  }
  h4 {
    font-size: 11pt;
    color: #475569;
    margin-top: 14px;
  }
  p, li {
    color: #334155;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
  }
  th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 600;
  }
  tr:nth-child(even) {
    background-color: #f8fafc;
  }
  code {
    background-color: #f1f5f9;
    color: #0969da;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 9.5pt;
  }
  pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
  }
  blockquote {
    border-left: 4px solid #3b82f6;
    margin: 12px 0;
    padding: 6px 16px;
    background-color: #eff6ff;
    color: #1e3a8a;
  }
  hr {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 24px 0;
  }
  .header-meta {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }
`;

async function convertMdToPdf() {
  console.log('=== Exporting Markdown Reports to High-Quality PDF ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const files = [
    '01_QA_Audit_Report.md',
    '02_Bug_and_Issue_Report.md',
    '03_Improvement_Recommendations.md'
  ];

  for (const f of files) {
    const mdPath = path.join(REPORTS_DIR, f);
    if (!fs.existsSync(mdPath)) {
      console.warn(`File not found: ${mdPath}`);
      continue;
    }

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const htmlBody = marked.parse(mdContent);
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${f}</title>
        <style>${CSS_STYLES}</style>
      </head>
      <body>
        ${htmlBody}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'load' });
    const pdfName = f.replace('.md', '.pdf');
    const pdfPath = path.join(REPORTS_DIR, pdfName);

    console.log(`Generating PDF for ${f} -> ${pdfName}...`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });

    console.log(`Successfully created: ${pdfPath}`);
  }

  await browser.close();
  console.log('PDF export complete!');
}

convertMdToPdf().catch(err => {
  console.error('Error generating PDFs:', err);
  process.exit(1);
});
