'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { AlertCircle, Copy, CheckCircle2 } from 'lucide-react';

interface Setup2FAState {
  qr_code_url?: string;
  secret?: string;
  backup_codes: string[];
  setup_id: string;
}

export function TwoFAForm() {
  const { toast } = useToast();
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<'initial' | 'setup' | 'verify'>('initial');
  const [setupData, setSetupData] = useState<Setup2FAState | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/settings/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'totp' }),
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setSetupStep('setup');
      } else {
        throw new Error('Failed to initiate 2FA setup');
      }
    } catch (error) {
      console.error('Error starting 2FA setup:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar configuração de 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Código deve ter 6 dígitos' });
      return;
    }

    if (!setupData) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/settings/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_id: setupData.setup_id,
          code: verificationCode,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Autenticação em dois fatores ativada',
          variant: 'default',
        });
        setTwoFAEnabled(true);
        setSetupStep('initial');
        setSetupData(null);
        setVerificationCode('');
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast({
        title: 'Erro',
        description: 'Código de verificação inválido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (setupStep === 'setup' && setupData) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Escaneie com seu autenticador</p>
            <p className="text-amber-700 mt-1">Use um aplicativo como Google Authenticator, Authy ou Microsoft Authenticator</p>
          </div>
        </div>

        {setupData.qr_code_url && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-center">
            <img src={setupData.qr_code_url} alt="QR Code" className="w-48 h-48" />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Ou insira manualmente:</p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 p-3 bg-gray-100 rounded font-mono text-sm break-all">
              {setupData.secret}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setupData.secret && copyToClipboard(setupData.secret)}
              className="flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Códigos de recuperação (salve em local seguro):</p>
          <div className="grid grid-cols-2 gap-2">
            {setupData.backup_codes.map((code) => (
              <div
                key={code}
                className="p-2 bg-gray-100 rounded text-sm font-mono flex justify-between items-center hover:bg-gray-200 cursor-pointer"
                onClick={() => copyToClipboard(code)}
              >
                <span>{code}</span>
                {copiedCode === code && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Verifique o código do autenticador</label>
          <Input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (errors.code) setErrors({});
            }}
            placeholder="000000"
            maxLength={6}
            className="text-2xl text-center tracking-widest"
          />
          {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code}</p>}
        </div>

        <Button onClick={handleVerify} disabled={loading} className="w-full">
          {loading ? 'Verificando...' : 'Confirmar 2FA'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setSetupStep('initial')}
          disabled={loading}
          className="w-full"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          {twoFAEnabled
            ? 'Autenticação em dois fatores está ativada. Você receberá um código adicional ao fazer login.'
            : 'Ative autenticação em dois fatores para aumentar a segurança da sua conta.'}
        </p>
      </div>

      {twoFAEnabled ? (
        <Button variant="destructive" className="w-full">
          Desativar 2FA
        </Button>
      ) : (
        <Button onClick={handleStartSetup} disabled={loading} className="w-full">
          {loading ? 'Iniciando...' : 'Ativar 2FA'}
        </Button>
      )}
    </div>
  );
}
