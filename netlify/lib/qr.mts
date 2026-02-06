import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URI (PNG base64).
 * White QR on transparent background for the dark card.
 */
export async function generateQrDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 180,
    margin: 1,
    color: {
      dark: '#ffffffdd',
      light: '#00000000',
    },
  });
}
