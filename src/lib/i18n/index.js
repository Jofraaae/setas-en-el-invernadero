import { Fragment, createElement, useSyncExternalStore } from 'react';
import { LANGS, SOURCE_LANG } from './languages';
import { detectLang, matchLang } from './detect';

/* Traducción por texto de origen: tr('Texto en español', { n: 3 }) devuelve el texto en el
   idioma activo (con {n} sustituido). Si falta la traducción, se muestra el español.
   trMark('…') es la misma cadena SIN traducir: sirve para marcar textos que se guardan en
   constantes y se traducen al mostrarlos con tr(valor). */

// Vite convierte esta llamada en un import dinámico por idioma (cada idioma es su propio trozo).
let locales = {};
try { locales = import.meta.glob('./locales/*.json', { import: 'default' }); } catch (e) { /* fuera de Vite: solo español */ }

let lang = SOURCE_LANG;
let dict = null; // null = español (idioma de origen)
let tpls = null; // plantillas con {x} del diccionario, para traducir mensajes del servidor
let version = 0;
const listeners = new Set();

const emit = () => { version++; listeners.forEach((f) => f()); };

function applyDocument() {
  try {
    document.documentElement.lang = lang;
    document.title = tr('Among Shrooms');
  } catch (e) { /* sin documento */ }
}

function fill(s, params) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
}

export function tr(key, params) {
  const s = (dict && dict[key]) || key;
  return fill(s, params);
}

export const trMark = (key) => key;

/* Como tr(), pero los valores pueden ser elementos de React (p. ej. un <b> de color). */
export function trNodes(key, params) {
  const s = (dict && dict[key]) || key;
  return s.split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return m && params && params[m[1]] != null ? createElement(Fragment, { key: i }, params[m[1]]) : part;
  });
}

/* Mensajes que llegan ya escritos del servidor (en español): se traducen buscando el texto
   exacto o una plantilla con huecos {n}. Si no hay traducción se deja tal cual. */
export function tServer(msg) {
  if (!dict || typeof msg !== 'string') return msg;
  if (dict[msg]) return dict[msg];
  if (!tpls) {
    tpls = Object.keys(dict)
      .filter((k) => /\{\w+\}/.test(k))
      .map((k) => {
        const names = [];
        const src = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (m, n) => { names.push(n); return '(.+?)'; });
        return { k, names, re: new RegExp(`^${src}$`) };
      });
  }
  for (const p of tpls) {
    const m = p.re.exec(msg);
    if (m) {
      const params = {};
      p.names.forEach((n, i) => { params[n] = m[i + 1]; });
      return fill(dict[p.k], params);
    }
  }
  return msg;
}

async function load(code) {
  if (code === SOURCE_LANG) return null;
  const loader = locales[`./locales/${code}.json`];
  if (!loader) return null;
  try { return await loader(); } catch (e) { return null; }
}

export async function setLang(code, persist = true) {
  const next = matchLang(code) || SOURCE_LANG;
  const d = await load(next);
  lang = next;
  dict = d;
  tpls = null;
  if (persist) { try { localStorage.setItem('lang', next); } catch (e) { /* ignorar */ } }
  applyDocument();
  emit();
}

export function getLang() { return lang; }

// Idioma inicial: el guardado, el del dispositivo o, si no, el de la zona horaria.
export const ready = setLang(detectLang(), false);

const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f); };
const snap = () => version;

/* Hook: re-renderiza el componente cuando cambia el idioma. Basta llamarlo en un
   componente alto (Home) para que todo lo de debajo se vuelva a pintar traducido. */
export function useLang() {
  useSyncExternalStore(subscribe, snap, snap);
  return { lang, setLang, langs: LANGS };
}
