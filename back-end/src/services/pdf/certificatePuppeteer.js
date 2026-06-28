import puppeteer from "puppeteer";
import { generateCertificateHtml } from "./certificateHtmlTemplate.js";

let browserInstance = null;

/**
 * Get or create a browser instance (with connection pooling)
 */
const getBrowser = async () => {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    browserInstance = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    return browserInstance;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[certificatePuppeteer] Failed to launch browser:", err);
    throw err;
  }
};

/**
 * Generate certificate PDF using Puppeteer
 * This renders the same design as the React component to PDF
 */
export const generateCertificatePdfPuppeteer = async ({
  userName,
  courseTitle,
  certTitle,
  issuedDate,
  certId,
}) => {
  let page;
  let browser;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport to A4 size at 96 DPI (297mm × 210mm = 1123 × 794 pixels)
    await page.setViewport({
      width: 1123,
      height: 794,
      deviceScaleFactor: 1,
    });

    // Generate HTML content
    const htmlContent = generateCertificateHtml({
      userName,
      courseTitle: certTitle || courseTitle || "Course Completion",
      issuedDate,
      certId,
    });

    // Set page content with all resources loaded
    await page.setContent(htmlContent, { 
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // Wait for fonts to load
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (e) {
      // Fonts might not be available, continue anyway
    }

    // Generate PDF with proper A4 settings and no scaling
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px"
      },
      scale: 1,
      printBackground: true,
      displayHeaderFooter: false,
    });

    await page.close();

    return pdfBuffer;
  } catch (err) {
    if (page) {
      await page.close().catch(() => {
        /* ignore */
      });
    }
    throw err;
  }
};

/**
 * Close the browser connection (can be called on server shutdown)
 */
export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
};
