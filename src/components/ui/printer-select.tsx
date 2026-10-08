'use client';

import { useState } from 'react';
import { Label } from './label';
import { Button } from './button';
import {
  getPrintMethod,
  setPrintMethod,
  connectUSB,
  connectBluetooth,
  isSecureContextOk,
  type PrintMethod,
} from '@/lib/escpos';
import { Plug, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function PrinterSelect() {
  const [method, setMethod] = useState<PrintMethod>(() => getPrintMethod());
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const doConnect = async (m: PrintMethod) => {
    if (m === 'system') return;
    setStatus('connecting');
    setMessage('');
    try {
      const name = m === 'usb' ? await connectUSB() : await connectBluetooth();
      setStatus('connected');
      setMessage(`Conectada: ${name}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo conectar');
    }
  };

  const onChange = (value: string) => {
    const m = value as PrintMethod;
    setMethod(m);
    setPrintMethod(m);
    setStatus('idle');
    setMessage('');
    if (m !== 'system') {
      void doConnect(m);
    }
  };

  const secure = isSecureContextOk();

  return (
    <div className="space-y-2">
      <Label htmlFor="print-method">Método de impresión</Label>
      <div className="flex gap-2">
        <select
          id="print-method"
          value={method}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="system">Sistema (diálogo)</option>
          <option value="usb">ESC/POS directo (USB)</option>
          <option value="bluetooth">ESC/POS directo (Bluetooth)</option>
        </select>
        {method !== 'system' && status !== 'connected' && (
          <Button type="button" variant="outline" disabled={status === 'connecting'} onClick={() => doConnect(method)} title="Conectar impresora">
            {status === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {method !== 'system' && !secure && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          USB/Bluetooth requieren HTTPS o localhost
        </p>
      )}
      {message && (
        <p className={`text-xs flex items-center gap-1 ${status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
          {status === 'connected' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {message}
        </p>
      )}
    </div>
  );
}
