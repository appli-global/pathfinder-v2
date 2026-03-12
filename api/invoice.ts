import { MongoClient } from 'mongodb';
import PDFDocument from 'pdfkit';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

if (!uri) {
  console.warn('[invoice-api] MONGODB_URI is not set. Invoice logging will be disabled.');
}

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

// Basic WATI configuration from environment
const WATI_BASE_URL = process.env.WATI_BASE_URL;
const WATI_API_KEY = process.env.WATI_API_KEY;
const WATI_TEMPLATE_NAME = process.env.WATI_TEMPLATE_NAME || 'pf_invoice_notification1';
const WATI_CHANNEL_NUMBER = process.env.WATI_CHANNEL_NUMBER;

// Razorpay server-side credentials for payment lookup
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function amountToWords(amount: number): string {
  // Simple placeholder; for now just return numeric string.
  // You can replace with a full number-to-words implementation later.
  return `${amount.toFixed(2)} Rupees`;
}

interface InvoiceRequestBody {
  sessionId: string;
  level: string;
  payment: {
    paymentId: string;
    orderId?: string;
    signature?: string;
    timestamp?: number;
  };
  billing: {
    name: string;
    phone: string;
    email?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  };
  amount: number; // in paise
  currency: string; // e.g. 'INR'
}

async function fetchRazorpayPaymentContact(paymentId?: string): Promise<string | null> {
  try {
    if (!paymentId) return null;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.warn('[invoice-api] Razorpay credentials missing, cannot look up payment contact');
      return null;
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const url = `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn('[invoice-api] Razorpay payment lookup failed', resp.status, text);
      return null;
    }

    const data: any = await resp.json();
    // Common Razorpay payment shape: contact may live at data.contact
    const contact: string | undefined = data.contact || data.notes?.contact || data.notes?.phone;
    if (!contact) {
      console.warn('[invoice-api] Razorpay payment has no contact field', { paymentId });
      return null;
    }

    return contact;
  } catch (err) {
    console.warn('[invoice-api] Error fetching Razorpay payment contact', err);
    return null;
  }
}

function createInvoicePdf(invoiceNumber: string, body: InvoiceRequestBody): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { billing, payment, amount } = body;
      const grossAmount = amount / 100; // paise -> rupees

      const gstRate = 18;
      const taxableValue = +(grossAmount / (1 + gstRate / 100)).toFixed(2);
      const gstAmount = +(grossAmount - taxableValue).toFixed(2);
      const halfGst = +(gstAmount / 2).toFixed(2);

      // Seller static details
      const sellerName = 'APPT INNOVATION LABS PVT LTD';
      const sellerAddress = 'House no 650, 2nd phase, 80 Feet Rd, 1st phase, Girinaagar, Banashankari, Bengaluru, Karnataka 560085';
      const sellerGst = '29ABACA7044A1Z2';
      const sellerPan = 'ABACA7044A';
      const sellerCin = 'U62090KA2024PTC188597';
      const placeOfSupply = 'Karnataka';

      const invoiceDate = payment.timestamp ? new Date(payment.timestamp) : new Date();

      // Colors - Red theme matching Appli logo
  const primaryColor = '#ED1164'; // Appli Pink/Red
      const darkColor = '#1e293b';
      const grayColor = '#64748b';
      const lightGray = '#f1f5f9';

      // ===== HEADER SECTION =====
      // Fetch and add logo
      let logoAdded = false;
      try {
        const logoUrl = 'https://pathfinder.appli.global/appli-logo.png';
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
          doc.image(logoBuffer, 50, 45, { width: 120 });
          logoAdded = true;
        }
      } catch (logoErr) {
        console.warn('[invoice-api] Failed to fetch logo, using text fallback', logoErr);
      }
      
      // Fallback to text if logo fails
      if (!logoAdded) {
        doc.fontSize(18).fillColor(primaryColor).font('Helvetica-Bold').text('APPLI', 50, 50);
      }
      
      // Invoice title on right
      doc.fontSize(28).fillColor(darkColor).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).fillColor(grayColor).font('Helvetica').text('Proforma Invoice - Original for Buyer', 400, 82, { align: 'right' });

      // Horizontal line
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor(primaryColor).lineWidth(2).stroke();

      // ===== INVOICE INFO ROW =====
      const infoY = 130;
      
      // Left: Company details
      doc.fontSize(9).fillColor(grayColor).font('Helvetica').text('FROM', 50, infoY);
      doc.fontSize(10).fillColor(darkColor).font('Helvetica-Bold').text(sellerName, 50, infoY + 15);
      doc.fontSize(9).fillColor(grayColor).font('Helvetica').text(sellerAddress, 50, infoY + 30, { width: 250 });
      doc.text(`GSTIN: ${sellerGst}`, 50, infoY + 58);
      doc.text(`PAN: ${sellerPan}`, 50, infoY + 71);
      doc.text(`CIN: ${sellerCin}`, 50, infoY + 84);

      // Right: Invoice details box
      const boxX = 350;
      const boxWidth = 195;
      doc.rect(boxX, infoY, boxWidth, 95).fillColor(lightGray).fill();
      
      doc.fontSize(9).fillColor(grayColor).font('Helvetica');
      doc.text('Invoice Number', boxX + 10, infoY + 10);
      doc.fontSize(11).fillColor(darkColor).font('Helvetica-Bold');
      doc.text(invoiceNumber, boxX + 10, infoY + 22);
      
      doc.fontSize(9).fillColor(grayColor).font('Helvetica');
      doc.text('Date', boxX + 10, infoY + 42);
      doc.fontSize(10).fillColor(darkColor).font('Helvetica');
      doc.text(invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), boxX + 10, infoY + 54);
      
      doc.fontSize(9).fillColor(grayColor).font('Helvetica');
      doc.text('Place of Supply', boxX + 10, infoY + 72);
      doc.fontSize(10).fillColor(darkColor).font('Helvetica');
      doc.text(placeOfSupply, boxX + 10, infoY + 84);

      // ===== BILL TO SECTION =====
      const billY = 250;
      doc.fontSize(9).fillColor(grayColor).font('Helvetica').text('BILL TO', 50, billY);
      doc.fontSize(12).fillColor(darkColor).font('Helvetica-Bold').text(billing.name, 50, billY + 15);
      doc.fontSize(10).fillColor(grayColor).font('Helvetica');
      doc.text(`Phone: ${billing.phone}`, 50, billY + 32);
    if (billing.email) doc.text(`Email: ${billing.email}`, 50, billY + 45);
    
    let addressLine = '';
    if (billing.addressLine1) addressLine += billing.addressLine1;
    if (billing.city || billing.state || billing.pincode) {
      const cityState = [billing.city, billing.state, billing.pincode].filter(Boolean).join(', ');
      if (addressLine && cityState) addressLine += ', ';
      addressLine += cityState;
    }
    if (addressLine) doc.text(addressLine, 50, billY + 58, { width: 250 });
    doc.text(`GSTIN: ${billing.gstin || 'N/A'}`, 50, billY + (addressLine ? 75 : 58));

    // ===== TABLE SECTION =====
    const tableY = 340;
    const tableWidth = 495;
    
    // Table header
    doc.rect(50, tableY, tableWidth, 30).fillColor(primaryColor).fill();
    doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('S.No', 60, tableY + 10);
    doc.text('Description', 100, tableY + 10);
    doc.text('Amount (₹)', 450, tableY + 10, { align: 'right', width: 85 });

    // Table row
    const rowY = tableY + 30;
    doc.rect(50, rowY, tableWidth, 40).fillColor('#ffffff').fill();
    doc.rect(50, rowY, tableWidth, 40).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.fontSize(10).fillColor(darkColor).font('Helvetica');
    doc.text('1', 60, rowY + 15);
    doc.font('Helvetica-Bold').text('Pathfinder AI - Career Discovery Assessment', 100, rowY + 8);
    doc.font('Helvetica').fontSize(9).fillColor(grayColor);
    doc.text('Complete Career Report (Single Attempt)', 100, rowY + 22);
    doc.fontSize(11).fillColor(darkColor).font('Helvetica-Bold');
    doc.text(taxableValue.toFixed(2), 450, rowY + 15, { align: 'right', width: 85 });

    // ===== TOTALS SECTION =====
    const totalsY = tableY + 90;
    const totalsX = 350;
    
    // Subtotal
    doc.fontSize(10).fillColor(grayColor).font('Helvetica');
    doc.text('Subtotal', totalsX, totalsY);
    doc.fillColor(darkColor).text(`₹ ${taxableValue.toFixed(2)}`, 450, totalsY, { align: 'right', width: 95 });
    
    // CGST
    doc.fillColor(grayColor).text('CGST @ 9%', totalsX, totalsY + 18);
    doc.fillColor(darkColor).text(`₹ ${halfGst.toFixed(2)}`, 450, totalsY + 18, { align: 'right', width: 95 });
    
    // SGST
    doc.fillColor(grayColor).text('SGST @ 9%', totalsX, totalsY + 36);
    doc.fillColor(darkColor).text(`₹ ${halfGst.toFixed(2)}`, 450, totalsY + 36, { align: 'right', width: 95 });
    
    // Divider
    doc.moveTo(totalsX, totalsY + 55).lineTo(545, totalsY + 55).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    // Grand Total
    doc.rect(totalsX - 10, totalsY + 60, 205, 30).fillColor(lightGray).fill();
    doc.fontSize(12).fillColor(darkColor).font('Helvetica-Bold');
    doc.text('TOTAL', totalsX, totalsY + 70);
    doc.fontSize(14).fillColor(primaryColor);
    doc.text(`₹ ${grossAmount.toFixed(2)}`, 450, totalsY + 68, { align: 'right', width: 95 });

    // Amount in words
    const words = amountToWords(grossAmount);
    doc.fontSize(9).fillColor(grayColor).font('Helvetica-Oblique');
    doc.text(`Amount in words: Rupees ${words} Only`, 50, totalsY + 100);

    // ===== FOOTER SECTION =====
    const footerY = 600;
    
    // Terms box
    doc.rect(50, footerY, 250, 80).fillColor(lightGray).fill();
    doc.fontSize(9).fillColor(darkColor).font('Helvetica-Bold');
    doc.text('Terms & Conditions', 60, footerY + 10);
    doc.fontSize(8).fillColor(grayColor).font('Helvetica');
    doc.text('• This is a computer-generated invoice', 60, footerY + 25);
    doc.text('• Payment is non-refundable', 60, footerY + 37);
    doc.text('• Report valid for single use only', 60, footerY + 49);
    doc.text('• Subject to Bangalore jurisdiction', 60, footerY + 61);

    // Signature area
    doc.fontSize(10).fillColor(darkColor).font('Helvetica-Bold');
    doc.text('For APPT INNOVATION LABS PRIVATE LIMITED', 330, footerY + 5);
    
    // Fetch and add signature image
    try {
      const signatureUrl = 'https://pathfinder.appli.global/signature.png';
      const signatureResponse = await fetch(signatureUrl);
      if (signatureResponse.ok) {
        const signatureBuffer = Buffer.from(await signatureResponse.arrayBuffer());
        doc.image(signatureBuffer, 350, footerY + 20, { width: 80 });
      }
    } catch (sigErr) {
      console.warn('[invoice-api] Failed to fetch signature image', sigErr);
    }
    
    doc.moveTo(330, footerY + 65).lineTo(520, footerY + 65).strokeColor(grayColor).lineWidth(0.5).stroke();
    doc.fontSize(10).fillColor(darkColor).font('Helvetica-Bold');
    doc.text('Authorized Signatory', 370, footerY + 70);

    // Bottom accent line
    doc.moveTo(50, 750).lineTo(545, 750).strokeColor(primaryColor).lineWidth(3).stroke();
    
    // Footer text
    doc.fontSize(8).fillColor(grayColor).font('Helvetica');
    doc.text('Thank you for choosing Pathfinder AI | www.appli.asia | contact@appli.asia', 50, 760, { align: 'center', width: 495 });

    doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function sendInvoiceViaWati(args: {
  billing: InvoiceRequestBody['billing'];
  invoiceNumber: string;
  invoiceUrl: string | null;
  grossAmount: number;
}) {
  try {
    if (!WATI_BASE_URL || !WATI_API_KEY) {
      console.warn('[invoice-api] WATI env vars missing, skipping WhatsApp notification');
      return;
    }

    const { billing, invoiceNumber, invoiceUrl, grossAmount } = args;
    const phone = (billing.phone || '').replace(/\D/g, '');
    if (!phone) {
      console.warn('[invoice-api] No phone number for WATI send');
      return;
    }
  const baseUrl = WATI_BASE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/v2/sendTemplateMessages`;

    const amountStr = grossAmount.toFixed(2);
    const name = billing.name || 'there';
    // WATI expects receivers with customParams per your final curl
    const payload: any = {
      template_name: WATI_TEMPLATE_NAME,
      broadcast_name: 'Pathfinder Invoice',
      receivers: [
        {
          whatsappNumber: phone,
          customParams: [
            { name: '1', value: name },
            { name: '2', value: invoiceUrl || '-' },
          ],
        },
      ],
      ...(WATI_CHANNEL_NUMBER ? { channel_number: WATI_CHANNEL_NUMBER } : {}),
    };

    console.log('[invoice-api] WATI request', {
      url,
      phone,
      template: WATI_TEMPLATE_NAME,
      hasApiKey: !!WATI_API_KEY,
      apiKeyPreview: WATI_API_KEY ? `${WATI_API_KEY.slice(0, 10)}...${WATI_API_KEY.slice(-10)}` : 'N/A',
      payload,
    });

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WATI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await resp.text();
    console.log('[invoice-api] WATI response', {
      status: resp.status,
      statusText: resp.statusText,
      body: responseText,
    });

    if (!resp.ok) {
      console.warn('[invoice-api] WATI send failed', resp.status, responseText);
      return;
    }

    console.log('[invoice-api] WATI invoice notification sent', { phone, invoiceNumber });
  } catch (err) {
    console.warn('[invoice-api] Error while sending WATI notification', err);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getClient();
    if (!client) {
      console.warn('[invoice-api] No Mongo client, skipping invoice generation');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const body = req.body as InvoiceRequestBody;
    const { sessionId, level, payment, billing, amount, currency } = body || {};

    if (!sessionId || !level || !payment || !billing || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields for invoice generation' });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_analysis_result');

    // If phone is missing in billing, try fetching it from Razorpay and
    // keep track of the resolved contact separately so we can persist it.
    let resolvedPhone: string | null = billing.phone || null;
    if (!billing.phone && payment?.paymentId) {
      const contact = await fetchRazorpayPaymentContact(payment.paymentId);
      if (contact) {
        resolvedPhone = String(contact);
        billing.phone = resolvedPhone;
        console.log('[invoice-api] Enriched billing.phone from Razorpay', {
          sessionId,
          paymentId: payment.paymentId,
        });
      }
    }

  const now = Date.now();
  const invoiceNumber = `PFINV-${now}`;

  const pdfBuffer = await createInvoicePdf(invoiceNumber, body);

  const invoiceBase64 = pdfBuffer.toString('base64');

    // Store invoice metadata in Mongo. Use upsert so that even if the
    // analysis document hasn't been created yet for this session, we
    // still persist the invoice details.
    await collection.updateOne(
      { sessionId },
      {
        $set: {
          invoiceNumber,
          invoiceBase64,
          invoiceGeneratedAt: new Date(now),
          billing,
          paymentSummary: {
            ...payment,
            // Store the final phone number we used for this payment (either
            // provided upfront or enriched from Razorpay) for audit/debugging.
            resolvedPhone,
          },
        },
      },
      { upsert: true },
    );

    // Upload invoice PDF to Blob and update Mongo with the URL.
    // We await this since Vercel functions terminate when response is sent.
    let finalBlobUrl: string | null = null;
    try {
      const { Readable } = await import('stream');
      const { put } = await import('@vercel/blob');
      const blobName = `invoices/${invoiceNumber}.pdf`;
      const stream = Readable.from(pdfBuffer);
      const result = await put(blobName, stream as any, {
        access: 'public',
        contentType: 'application/pdf',
      } as any);
      finalBlobUrl = result.url;
      console.log('[invoice-api] Uploaded invoice PDF to Blob', { sessionId, invoiceNumber, url: finalBlobUrl });

      // Update Mongo with the Blob URL
      await collection.updateOne(
        { sessionId },
        {
          $set: {
            invoiceBlobUrl: finalBlobUrl,
            invoiceBlobUploadedAt: new Date(),
          },
        },
      );
    } catch (err) {
      console.warn('[invoice-api] Failed to upload invoice PDF to Blob', err);
    }

    // Send WhatsApp notification via WATI - await to ensure we see the response logs
    const grossAmount = amount / 100;
    try {
      await sendInvoiceViaWati({ billing, invoiceNumber, invoiceUrl: finalBlobUrl, grossAmount });
    } catch (err) {
      console.warn('[invoice-api] WATI send threw error', err);
    }

    return res.status(200).json({ ok: true, invoiceNumber, invoiceBlobUrl: finalBlobUrl });
  } catch (err) {
    console.error('[invoice-api] Error generating invoice', err);
    return res.status(200).json({ ok: false, error: 'invoice_generation_failed' });
  }
}
