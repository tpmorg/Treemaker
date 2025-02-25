import QRCode from 'qrcode';

export async function generateQrCode(data: string): Promise<string> {
    try {
        // Generate QR code as data URL
        const url = await QRCode.toDataURL(data, {
            width: 250,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        return url;
    } catch (error) {
        console.error('QR code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}