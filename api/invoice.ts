import { MongoClient } from 'mongodb';
import PDFDocument from 'pdfkit';
import { put } from '@vercel/blob';

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

function createInvoicePdf(invoiceNumber: string, body: InvoiceRequestBody): Buffer {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const { billing, payment, amount } = body;
  const grossAmount = amount / 100; // paise -> rupees

  const gstRate = 18;
  const taxableValue = +(grossAmount / (1 + gstRate / 100)).toFixed(2);
  const gstAmount = +(grossAmount - taxableValue).toFixed(2);
  const halfGst = +(gstAmount / 2).toFixed(2);

  // Seller static details - adjust to your actual legal details
  const sellerName = 'APPT INNOVATION LABS PVT LTD';
  const sellerAddress = 'House no 650, 2nd phase, 80 Feet Rd, 1st phase\nGirinaagar, Banashankari, Bengaluru, Karnataka 560085';
  const sellerGst = '29ABACA7044A1Z2';
  const sellerPan = 'ABACA7044A';
  const sellerCin = 'U62090KA2024PTC188597';
  const placeOfSupply = 'Bangalore';

  const invoiceDate = payment.timestamp ? new Date(payment.timestamp) : new Date();

  // Header
  doc.fontSize(12).text('Proforma INVOICE', { align: 'left' });
  doc.text('Original for Buyer');
  doc.moveDown(0.5);

  // Seller block
  doc.fontSize(11).text(sellerName, { align: 'left' });
  doc.text(sellerAddress);
  doc.text(`CIN: ${sellerCin}`);

  doc.moveDown(1);

  // Invoice + client details (simple stacked layout)
  doc.fontSize(10);
  doc.text(`Invoice Number: ${invoiceNumber}`);
  doc.text(`Date: ${invoiceDate.toDateString()}`);
  doc.text(`Place of Supply: ${placeOfSupply}`);
  doc.text(`GST: ${sellerGst}`);
  doc.text(`PAN: ${sellerPan}`);

  doc.moveDown(0.5);
  doc.text(`Client: ${billing.name}`);
  doc.text(`Phone: ${billing.phone}`);
  if (billing.email) doc.text(`Email: ${billing.email}`);
  if (billing.addressLine1) doc.text(`Address: ${billing.addressLine1}`);
  if (billing.city || billing.state || billing.pincode) {
    const line = [billing.city, billing.state, billing.pincode].filter(Boolean).join(', ');
    if (line) doc.text(line);
  }
  doc.text(`GSTIN: ${billing.gstin || '-'}`);

  doc.moveDown(1);

  // Table header
  doc.fontSize(10).text('S. No.', 50, doc.y, { continued: true });
  doc.text('Description', 90, doc.y, { continued: true });
  doc.text('Total in INR', 400, doc.y);

  doc.moveTo(40, doc.y + 4).lineTo(550, doc.y + 4).stroke();
  doc.moveDown(0.7);

  // Single line item
  const description = 'Pathfinder AI - Career Discovery Assessment & Report (Single Attempt)';
  doc.text('1', 50, doc.y, { continued: true });
  doc.text(description, 90, doc.y, { continued: true });
  doc.text(grossAmount.toFixed(2), 400, doc.y);

  doc.moveDown(1);

  // Totals section
  doc.text(`Total Value: ${taxableValue.toFixed(2)}`);
  doc.text(`Add: CGST @ 9%: ${halfGst.toFixed(2)}`);
  doc.text(`Add: SGST @ 9%: ${halfGst.toFixed(2)}`);
  doc.text(`Grand Total: ${grossAmount.toFixed(2)}`);

  doc.moveDown(1);

  const words = amountToWords(grossAmount);
  doc.text(`(Rupees ${words} Only)`);

  doc.moveDown(1);

  // Simple terms footer
  doc.fontSize(9).text('This is a system-generated invoice for your Pathfinder AI career report purchase.', {
    width: 500,
  });

  doc.moveDown(2);
  doc.text('For APPT INNOVATION LABS PVT LTD');
  doc.moveDown(2);
  doc.text('Authorised Signatory');

  doc.end();

  return Buffer.concat(chunks);
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

    const now = Date.now();
    const invoiceNumber = `PFINV-${now}`;

    const pdfBuffer = createInvoicePdf(invoiceNumber, body);

    // Upload invoice PDF to Vercel Blob
    let invoiceBlobUrl: string | null = null;
    try {
      const blobKey = `invoices/${sessionId}-${invoiceNumber}.pdf`;
      const { url } = await put(blobKey, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      });
      invoiceBlobUrl = url;
      console.log('[invoice-api] Stored invoice blob', { sessionId, blobKey, url });
    } catch (blobErr) {
      console.warn('[invoice-api] Failed to store invoice blob', blobErr);
    }

    // Store invoice metadata in Mongo
    await collection.updateOne(
      { sessionId },
      {
        $set: {
          invoiceNumber,
          invoiceBlobUrl,
          invoiceGeneratedAt: new Date(now),
          billing,
          paymentSummary: payment,
        },
      },
      { upsert: false },
    );

    return res.status(200).json({ ok: true, invoiceNumber, invoiceBlobUrl });
  } catch (err) {
    console.error('[invoice-api] Error generating invoice', err);
    return res.status(200).json({ ok: false, error: 'invoice_generation_failed' });
  }
}
