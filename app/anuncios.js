// 📺 Anuncios de AdMob, solo en la app Android: el de premio (fichas) y un intersticial cada 3 partidas de un jugador.
import { leer, guardar } from '../games/comun.js';
import { ANUNCIOS } from '../anuncios-config.js';
import { E } from './estado.js';

const admob = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.AdMob : null;
const CADA = 3; // partidas entre intersticiales
let listo = Promise.resolve(); // initialize + consentimiento
let intersticial = ''; // '', 'cargando' o 'listo' (pedido de antemano)
let debe = false; // tocaba y no se pudo mostrar: sale al terminar la próxima partida

export const hayAnuncios = () => Boolean(admob);
const sinIntersticial = () => leer('ajuste:sinAnuncios') === '1'; // compra «Quitar anuncios» (C2)

// Al abrir la app: AdMob y, donde la ley lo pide, el formulario de consentimiento de Google.
export function iniciarAnuncios() {
  if (!admob) return;
  listo = (async () => {
    await admob.initialize({});
    const info = await admob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') await admob.showConsentForm();
  })().catch(() => {});
}

// Anuncio con premio: true solo si se vio entero.
export async function verAnuncioPremio() {
  if (!admob) return false;
  await listo;
  let premiado = false;
  let cerrar;
  const cerrado = new Promise((r) => (cerrar = r));
  // showRewardVideoAd solo responde al ganar el premio: si se cierra antes (o no se puede mostrar), avisan estos eventos.
  const escuchas = await Promise.all([
    admob.addListener('onRewardedVideoAdReward', () => (premiado = true)),
    admob.addListener('onRewardedVideoAdDismissed', () => cerrar()),
    admob.addListener('onRewardedVideoAdFailedToShow', () => cerrar()),
  ]);
  try {
    await admob.prepareRewardVideoAd({ adId: ANUNCIOS.premio, isTesting: ANUNCIOS.prueba });
    await Promise.race([admob.showRewardVideoAd(), cerrado]);
  } catch {
    // sin anuncio disponible (o sin conexión): no hay premio
  } finally {
    escuchas.forEach((e) => e.remove());
  }
  return premiado;
}

// Una partida de un jugador terminada: cada CADA, el intersticial sale en el acto (al cerrarlo se ven los
// resultados). Se precarga una partida antes; si aún no estaba cargado, sale al terminar la siguiente
// (nunca más tarde, encima de otra partida).
export function finDePartida() {
  if (!admob || sinIntersticial() || E.enDuelo || E.enVivo) return;
  const n = (Number(leer('anuncios:partidas')) || 0) + 1;
  guardar('anuncios:partidas', String(n));
  if (n % CADA === CADA - 1) precargar();
  if (n % CADA === 0 || debe) mostrarIntersticial();
}

function precargar() {
  if (intersticial) return;
  intersticial = 'cargando';
  listo
    .then(() => admob.prepareInterstitial({ adId: ANUNCIOS.intersticial, isTesting: ANUNCIOS.prueba }))
    .then(() => (intersticial = 'listo'), () => (intersticial = ''));
}

function mostrarIntersticial() {
  if (intersticial !== 'listo') {
    debe = true;
    precargar();
    return;
  }
  debe = false;
  intersticial = '';
  admob.showInterstitial().catch(() => {});
}
