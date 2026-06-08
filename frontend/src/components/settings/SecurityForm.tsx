'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { AlertCircle } from 'lucide-react';

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function SecurityForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [formData, setFormData] = useState<ChangePasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.current_password) {
      newErrors.current_password = 'Senha atual é obrigatória';
    }

    if (!formData.new_password || formData.new_password.length < 8) {
      newErrors.new_password = 'Nova senha deve ter pelo menos 8 caracteres';
    }

    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Senhas não conferem';
    }

    if (formData.new_password === formData.current_password) {
      newErrors.new_password = 'Nova senha deve ser diferente da atual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/settings/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Senha alterada com sucesso',
          variant: 'default',
        });
        setFormData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Falha ao alterar senha');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao alterar senha',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Proteja sua conta</p>
          <p className="text-blue-700 mt-1">Use uma senha forte com letras, números e símbolos</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Senha Atual</label>
        <Input
          name="current_password"
          type={showPasswords ? 'text' : 'password'}
          value={formData.current_password}
          onChange={handleInputChange}
          placeholder="Senha atual"
          className={errors.current_password ? 'border-red-500' : ''}
        />
        {errors.current_password && (
          <p className="text-red-600 text-sm mt-1">{errors.current_password}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nova Senha</label>
        <Input
          name="new_password"
          type={showPasswords ? 'text' : 'password'}
          value={formData.new_password}
          onChange={handleInputChange}
          placeholder="Nova senha (mínimo 8 caracteres)"
          className={errors.new_password ? 'border-red-500' : ''}
        />
        {errors.new_password && (
          <p className="text-red-600 text-sm mt-1">{errors.new_password}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Confirmar Nova Senha</label>
        <Input
          name="confirm_password"
          type={showPasswords ? 'text' : 'password'}
          value={formData.confirm_password}
          onChange={handleInputChange}
          placeholder="Confirme a nova senha"
          className={errors.confirm_password ? 'border-red-500' : ''}
        />
        {errors.confirm_password && (
          <p className="text-red-600 text-sm mt-1">{errors.confirm_password}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="show_passwords"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
        <label htmlFor="show_passwords" className="ml-2 text-sm cursor-pointer">
          Mostrar senhas
        </label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Alterando...' : 'Alterar Senha'}
      </Button>
    </form>
  );
}
