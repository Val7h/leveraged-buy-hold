'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';

interface ProfileFormData {
  bio: string;
  phone_number: string;
  country: string;
  timezone: string;
  language: string;
  theme: string;
  is_profile_public: boolean;
  show_portfolio_summary: boolean;
}

export function ProfileForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: '',
    phone_number: '',
    country: '',
    timezone: 'UTC',
    language: 'pt_BR',
    theme: 'light',
    is_profile_public: false,
    show_portfolio_summary: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/settings/profile');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          bio: data.bio || '',
          phone_number: data.phone_number || '',
          country: data.country || '',
          timezone: data.timezone || 'UTC',
          language: data.language || 'pt_BR',
          theme: data.theme || 'light',
          is_profile_public: data.is_profile_public || false,
          show_portfolio_summary: data.show_portfolio_summary || false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar perfil',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Perfil atualizado com sucesso',
          variant: 'default',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <Textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Descreva-se brevemente"
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefone</label>
          <Input
            name="phone_number"
            type="tel"
            value={formData.phone_number}
            onChange={handleInputChange}
            placeholder="+55 11 99999-9999"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">País</label>
          <Input
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            placeholder="Brasil"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fuso Horário</label>
          <Select value={formData.timezone} onValueChange={(value) => handleSelectChange('timezone', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/Sao_Paulo">São Paulo (Brasil)</SelectItem>
              <SelectItem value="America/New_York">New York</SelectItem>
              <SelectItem value="Europe/London">Londres</SelectItem>
              <SelectItem value="Asia/Tokyo">Tóquio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Idioma</label>
          <Select value={formData.language} onValueChange={(value) => handleSelectChange('language', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tema</label>
          <Select value={formData.theme} onValueChange={(value) => handleSelectChange('theme', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="auto">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center">
          <Checkbox
            id="is_profile_public"
            checked={formData.is_profile_public}
            onCheckedChange={(checked) => handleCheckboxChange('is_profile_public', checked as boolean)}
          />
          <label htmlFor="is_profile_public" className="ml-2 text-sm cursor-pointer">
            Tornar perfil público
          </label>
        </div>

        <div className="flex items-center">
          <Checkbox
            id="show_portfolio_summary"
            checked={formData.show_portfolio_summary}
            onCheckedChange={(checked) => handleCheckboxChange('show_portfolio_summary', checked as boolean)}
          />
          <label htmlFor="show_portfolio_summary" className="ml-2 text-sm cursor-pointer">
            Mostrar resumo da carteira
          </label>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
}
