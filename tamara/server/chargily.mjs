/** Server-only integration primitive. Not imported by the Pages demo.
 * Activation requires the shared database, authenticated server and merchant account.
 * Docs checked: https://dev.chargily.com/pay-v2/webhooks
 */
import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyWebhook(rawBody,signature,secret){
 if(!secret||!Buffer.isBuffer(rawBody)||typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',secret).update(rawBody).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export function validatePaidEvent(event,expected){
 if(event?.type!=='checkout.paid'||!event.id||event.data?.id!==expected.checkoutId||event.data.status!=='paid'||event.data.amount!==expected.amount||event.data.currency!==expected.currency)throw Error('Payment event does not match the stored checkout.');
 return {eventId:event.id,checkoutId:event.data.id};
}
// Consume only inside a database transaction with UNIQUE(eventId), verified order ID,
// stored checkout ID, amount and currency. Never mark paid from the success redirect.
