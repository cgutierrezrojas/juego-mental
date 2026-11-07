// 📺 Anuncios de AdMob, solo en la app Android: el de premio (fichas) y un intersticial cada 3 partidas de un jugador.
import { leer, guardar } from '../games/comun.js';
import { ANUNCIOS } from '../anuncios-config.js';
import { E } from './estado.js';

const admob = window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins.AdMob : null;
const CADA = 3; // partidas entre intersticiales
let listo = Promise.resolve(); // initialize + consentimiento
let precargado = Promise.resolve(false); // intersticial pedido de antemano (true si cargó)

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
  const escucha = await admob.addListener('onRewardedVideoAdReward', () => (premiado = true));
  try {
    await admob.prepareRewardVideoAd({ adId: ANUNCIOS.premio, isTesting: ANUNCIOS.prueba });
    await admob.showRewardVideoAd();
  } catch {
    // sin anuncio disponible (o sin conexión): no hay premio
  } finally {
    escucha.remove();
  }
  return premiado;
}

// Una partida de un jugador terminada: cada CADA, el intersticial sale al segundo (al cerrarlo se ven los
// resultados). Se precarga una partida antes para que no tarde.
export function finDePartida() {
  if (!admob || sinIntersticial() || E.enDuelo || E.enVivo) return;
  const n = (Number(leer('anuncios:partidas')) || 0) + 1;
  guardar('anuncios:partidas', String(n));
  if (n % CADA === CADA - 1) precargar();
  if (n % CADA === 0) setTimeout(mostrarIntersticial, 1000);
}

function precargar() {
  precargado = listo
    .then(() => admob.prepareInterstitial({ adId: ANUNCIOS.intersticial, isTesting: ANUNCIOS.prueba }))
    .then(() => true, () => false);
}

async function mostrarIntersticial() {
  try {
    if (!(await precargado)) precargar(); // no estaba listo (p. ej. se abrió la app justo antes): se pide ahora
    if (await precargado) await admob.showInterstitial();
  } catch {
    // sin anuncio: se sigue
  }
  precargado = Promise.resolve(false);
}
