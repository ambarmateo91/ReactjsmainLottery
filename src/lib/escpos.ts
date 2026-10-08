// Driver ESC/POS directo por WebUSB / WebBluetooth.
// Requiere contexto seguro: HTTPS o localhost.

export type PrintMethod = 'system' | 'usb' | 'bluetooth';

const STORAGE_KEY = 'print-method';

export function getPrintMethod(): PrintMethod {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'usb' || v === 'bluetooth' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

export function setPrintMethod(method: PrintMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY, method);
  } catch {
    // ignore
  }
}

// ---------- ESC/POS ----------

const ESC = 0x1b;
const GS = 0x1d;

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Codifica a Latin-1 (cubre ñ, tildes, ¡, ¿). */
function encodeText(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i] = code <= 0xff ? code : 0x3f; // ? si no representable
  }
  return out;
}

const INIT = new Uint8Array([ESC, 0x40]);
const CODEPAGE_LATIN1 = new Uint8Array([ESC, 0x74, 16]);
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 1]);
const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 2]);
const BOLD_ON = new Uint8Array([ESC, 0x45, 1]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0]);
const SIZE_NORMAL = new Uint8Array([GS, 0x21, 0]);
const SIZE_DOUBLE = new Uint8Array([GS, 0x21, 0x11]);
const SIZE_BIG = new Uint8Array([GS, 0x21, 0x22]);
const CUT_PARTIAL = new Uint8Array([GS, 0x56, 1]);
const LF = new Uint8Array([0x0a]);

function line(text = ''): Uint8Array {
  return concat(encodeText(text), LF);
}

function dashes(width = 42): Uint8Array {
  return line('-'.repeat(width));
}

/** Fila etiqueta-izquierda / valor-derecha en 42 columnas. */
function row(label: string, value: string, width = 42): Uint8Array {
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ');
  const l = clean(label);
  const v = clean(value);
  const spaces = Math.max(1, width - l.length - v.length);
  return line(l + ' '.repeat(spaces) + v);
}

export interface EscPosTicket {
  ticketNumber: string;
  lotteryName: string;
  playType: string;
  numbers: string;
  amount: number;
  sellerName: string;
  soldAt?: string;
  drawDate?: string;
  drawTime?: string;
}

function capitalize(value: string): string {
  const v = value.trim().toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function longDate(iso?: string): string {
  try {
    return new Date(iso || Date.now()).toLocaleDateString('es-DO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatDrawTime(value?: string | null): string {
  if (!value) return '';
  const parts = String(value).split(':');
  if (parts.length < 2) return String(value);
  let h = Number(parts[0]);
  const m = parts[1];
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

function formatEmision(iso?: string): string {
  try {
    return new Date(iso || Date.now()).toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function buildEscPosReceipt(items: EscPosTicket[]): Uint8Array {
  const chunks: Uint8Array[] = [INIT, CODEPAGE_LATIN1];
  for (const t of items) {
    const playLabel = t.playType ? capitalize(t.playType) : '';
    const drawTime = formatDrawTime(t.drawTime);
    chunks.push(
      ALIGN_CENTER,
      BOLD_ON,
      SIZE_NORMAL,
      line(`LOTERIA - ${t.lotteryName}`),
      BOLD_OFF,
      dashes(),
      ALIGN_LEFT,
      row('Ticket:', t.ticketNumber),
      row('Loteria:', t.lotteryName),
      row('Tipo:', playLabel),
      dashes(),
      line('Numeros:'),
      ALIGN_CENTER,
      BOLD_ON,
      SIZE_BIG,
      line(t.numbers),
      SIZE_NORMAL,
      BOLD_OFF,
      ALIGN_LEFT,
      dashes()
    );
    // Monto a la derecha en negrita
    const amountStr = `RD$${Number(t.amount || 0).toFixed(2)}`;
    chunks.push(ALIGN_RIGHT, BOLD_ON, line(`Monto:  ${amountStr}`), BOLD_OFF, ALIGN_LEFT);
    chunks.push(
      line('------------------------------------------'),
      ALIGN_CENTER,
      BOLD_ON,
      line('Valido para:'),
      BOLD_OFF,
      line(longDate(t.drawDate)),
      BOLD_ON,
      line(drawTime ? `${t.lotteryName} - ${drawTime}` : t.lotteryName),
      BOLD_OFF,
      dashes(),
      line('Fecha emision:'),
      line(formatEmision(t.soldAt)),
      line('------------------------------------------'),
      BOLD_ON,
      line('Revise su Ticket'),
      line('BUENA SUERTE!'),
      BOLD_OFF,
      line(''),
      line('*** TICKET VALIDO ***'),
      line(''),
      line(''),
      line('')
    );
  }
  chunks.push(CUT_PARTIAL);
  return concat(...chunks);
}

// ---------- Transporte WebUSB ----------

interface USBRefs {
  device: any;
  endpoint: number;
}

let usbRefs: USBRefs | null = null;

function getUSB(): any {
  const nav = navigator as any;
  if (!nav.usb) throw new Error('WebUSB no disponible (usa Chrome/Edge por HTTPS o localhost)');
  return nav.usb;
}

export async function connectUSB(): Promise<string> {
  const usb = getUSB();
  let device = (await usb.getDevices())?.[0];
  if (!device) {
    device = await usb.requestDevice({ filters: [{ classCode: 7 }] });
  }
  await device.open();
  const configValue = device.configuration?.configurationValue || 1;
  try {
    await device.selectConfiguration(configValue);
  } catch {
    // ya seleccionada
  }
  const iface = device.configuration.interfaces[0];
  const ifaceNumber = iface.interfaceNumber;
  await device.claimInterface(ifaceNumber);
  const alternate = iface.alternates[0];
  const outEp = alternate.endpoints.find((e: any) => e.direction === 'out');
  if (!outEp) throw new Error('No se encontró endpoint de escritura en la impresora');
  usbRefs = { device, endpoint: outEp.endpointNumber };
  return device.productName || 'Impresora USB';
}

async function writeUSB(data: Uint8Array): Promise<void> {
  if (!usbRefs) throw new Error('Impresora USB no conectada');
  const { device, endpoint } = usbRefs;
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    await device.transferOut(endpoint, data.slice(i, i + CHUNK));
  }
}

export function isUSBConnected(): boolean {
  return usbRefs !== null;
}

// ---------- Transporte WebBluetooth ----------

const NORDIC_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

interface BTRefs {
  device: any;
  characteristic: any;
}

let btRefs: BTRefs | null = null;

function getBT(): any {
  const nav = navigator as any;
  if (!nav.bluetooth) throw new Error('WebBluetooth no disponible (usa Chrome/Edge por HTTPS o localhost)');
  return nav.bluetooth;
}

export async function connectBluetooth(): Promise<string> {
  const bt = getBT();
  let device = null;
  try {
    const devices = (await bt.getDevices?.()) || [];
    device = devices[0] || null;
  } catch {
    device = null;
  }
  if (!device) {
    device = await bt.requestDevice({
      filters: [{ services: [NORDIC_UART_SERVICE] }],
      optionalServices: [NORDIC_UART_SERVICE],
    });
  }
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
  const characteristic = await service.getCharacteristic(NORDIC_UART_RX);
  btRefs = { device, characteristic };
  device.addEventListener?.('gattserverdisconnected', () => {
    btRefs = null;
  });
  return device.name || 'Impresora Bluetooth';
}

async function writeBluetooth(data: Uint8Array): Promise<void> {
  if (!btRefs) throw new Error('Impresora Bluetooth no conectada');
  const { characteristic } = btRefs;
  const CHUNK = 100;
  const canNoResponse = characteristic.properties?.writeWithoutResponse;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (canNoResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }
    await new Promise((r) => setTimeout(r, 15));
  }
}

export function isBluetoothConnected(): boolean {
  return btRefs !== null;
}

// ---------- API principal ----------

export function isSecureContextOk(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export async function printEscPos(items: EscPosTicket[], method: PrintMethod): Promise<string> {
  if (!isSecureContextOk()) {
    throw new Error('USB/Bluetooth requieren HTTPS o localhost');
  }
  const data = buildEscPosReceipt(items);
  if (method === 'usb') {
    if (!isUSBConnected()) await connectUSB();
    await writeUSB(data);
    return 'Ticket enviado a impresora USB + corte de papel';
  }
  if (method === 'bluetooth') {
    if (!isBluetoothConnected()) await connectBluetooth();
    await writeBluetooth(data);
    return 'Ticket enviado a impresora Bluetooth + corte de papel';
  }
  throw new Error('Método de impresión no válido');
}

/** Envía a imprimir según el método: sistema (diálogo) o ESC/POS directo. */
export async function dispatchPrint(items: EscPosTicket[], method: PrintMethod): Promise<string | null> {
  if (method === 'system') {
    const { autoPrintTickets } = await import('./ticket-print');
    autoPrintTickets(items);
    return null;
  }
  return printEscPos(items, method);
}
