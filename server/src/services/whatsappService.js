export const sendWhatsAppMessage = async (to, body) => {
    // In a real app, this would use Twilio Client:
    // client.messages.create({ from: 'whatsapp:+14155238886', to: `whatsapp:${to}`, body })

    console.log(`🚀 [MOCK WHATSAPP] Sending to ${to}: "${body}"`);
    return true;
};
