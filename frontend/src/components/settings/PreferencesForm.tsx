'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/useToast';

interface PreferencesData {
  email_alerts: boolean;
  push_notifications: boolean;
  sms_alerts: boolean;
  marketing_emails: boolean;
  daily_digest: boolean;
  daily_digest_time: string;
  price_alerts: boolean;
  milestone_alerts: boolean;
  allow_analytics: boolean;
  allow_improvements: boolean;
}

export function PreferencesForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PreferencesData>({
    email_alerts: true,
    push_notifications: true,
    sms_alerts: false,
    marketing_emails: false,
    daily_digest: false,
    daily_digest_time: '09:00',
    price_alerts: true,
    milestone_alerts: true,
    allow_analytics: true,
    allow_improvements: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/v1/settings/preferences');
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, daily_digest_time: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Preferências atualizadas',
          variant: 'default',
        });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar preferências',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notifications Section */}
      <div className="border-b pb-6">
        <h3 className="font-semibold text-lg mb-4">Notificações</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Checkbox
              id="email_alerts"
              checked={formData.email_alerts}
              onCheckedChange={(checked) => handleCheckboxChange('email_alerts', checked as boolean)}
            />
            <label htmlFor="email_alerts" className="ml-2 text-sm cursor-pointer">
              Alertas por E-mail
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="push_notifications"
              checked={formData.push_notifications}
              onCheckedChange={(checked) => handleCheckboxChange('push_notifications', checked as boolean)}
            />
            <label htmlFor="push_notifications" className="ml-2 text-sm cursor-pointer">
              Notificações Push
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="sms_alerts"
              checked={formData.sms_alerts}
              onCheckedChange={(checked) => handleCheckboxChange('sms_alerts', checked as boolean)}
            />
            <label htmlFor="sms_alerts" className="ml-2 text-sm cursor-pointer">
              Alertas por SMS
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="marketing_emails"
              checked={formData.marketing_emails}
              onCheckedChange={(checked) => handleCheckboxChange('marketing_emails', checked as boolean)}
            />
            <label htmlFor="marketing_emails" className="ml-2 text-sm cursor-pointer">
              E-mails de Marketing
            </label>
          </div>
        </div>
      </div>

      {/* Daily Digest Section */}
      <div className="border-b pb-6">
        <h3 className="font-semibold text-lg mb-4">Resumo Diário</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Checkbox
              id="daily_digest"
              checked={formData.daily_digest}
              onCheckedChange={(checked) => handleCheckboxChange('daily_digest', checked as boolean)}
            />
            <label htmlFor="daily_digest" className="ml-2 text-sm cursor-pointer">
              Receber resumo diário
            </label>
          </div>

          {formData.daily_digest && (
            <div className="ml-6 mt-2">
              <label htmlFor="daily_digest_time" className="block text-sm font-medium mb-1">
                Horário de envio
              </label>
              <Input
                id="daily_digest_time"
                type="time"
                value={formData.daily_digest_time}
                onChange={handleTimeChange}
                className="w-32"
              />
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Alerts Section */}
      <div className="border-b pb-6">
        <h3 className="font-semibold text-lg mb-4">Alertas da Carteira</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Checkbox
              id="price_alerts"
              checked={formData.price_alerts}
              onCheckedChange={(checked) => handleCheckboxChange('price_alerts', checked as boolean)}
            />
            <label htmlFor="price_alerts" className="ml-2 text-sm cursor-pointer">
              Alertas de Preço
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="milestone_alerts"
              checked={formData.milestone_alerts}
              onCheckedChange={(checked) => handleCheckboxChange('milestone_alerts', checked as boolean)}
            />
            <label htmlFor="milestone_alerts" className="ml-2 text-sm cursor-pointer">
              Alertas de Marcos (Metas Atingidas)
            </label>
          </div>
        </div>
      </div>

      {/* Data & Privacy Section */}
      <div className="pb-6">
        <h3 className="font-semibold text-lg mb-4">Dados e Privacidade</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Checkbox
              id="allow_analytics"
              checked={formData.allow_analytics}
              onCheckedChange={(checked) => handleCheckboxChange('allow_analytics', checked as boolean)}
            />
            <label htmlFor="allow_analytics" className="ml-2 text-sm cursor-pointer">
              Permitir análise de uso
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="allow_improvements"
              checked={formData.allow_improvements}
              onCheckedChange={(checked) => handleCheckboxChange('allow_improvements', checked as boolean)}
            />
            <label htmlFor="allow_improvements" className="ml-2 text-sm cursor-pointer">
              Ajudar a melhorar o produto
            </label>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar Preferências'}
      </Button>
    </form>
  );
}
