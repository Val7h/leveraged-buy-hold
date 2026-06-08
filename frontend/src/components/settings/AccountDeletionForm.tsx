'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { AlertCircle, Trash2 } from 'lucide-react';

interface DeletionStatus {
  scheduled_for_deletion: boolean;
  deletion_date: string | null;
  days_until_deletion: number | null;
  confirmation_sent: boolean;
  confirmation_deadline: string | null;
}

export function AccountDeletionForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch deletion status on mount
  useEffect(() => {
    fetchDeletionStatus();
  }, []);

  const fetchDeletionStatus = async () => {
    try {
      const response = await fetch('/api/v1/settings/account/deletion-status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setDeletionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching deletion status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória para confirmar exclusão';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmitDeletion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmittingDeletion(true);

    try {
      const response = await fetch('/api/v1/settings/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password,
          reason: formData.reason || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeletionStatus({
          scheduled_for_deletion: true,
          deletion_date: data.deletion_scheduled_for,
          days_until_deletion: 7,
          confirmation_sent: data.confirmation_required,
          confirmation_deadline: new Date(
            new Date(data.deletion_scheduled_for).getTime() - 24 * 60 * 60 * 1000
          ).toISOString(),
        });

        toast({
          title: 'Sucesso',
          description: 'Exclusão de conta agendada. Verifique seu email para confirmar.',
          variant: 'default',
        });

        setShowDeleteConfirm(false);
        setFormData({ password: '', reason: '' });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Falha ao agendar exclusão de conta');
      }
    } catch (error) {
      console.error('Error requesting deletion:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao agendar exclusão',
        variant: 'destructive',
      });
    } finally {
      setSubmittingDeletion(false);
    }
  };

  if (loadingStatus) {
    return <div className="text-center py-4">Carregando status da conta...</div>;
  }

  if (deletionStatus?.scheduled_for_deletion) {
    const deletionDate = new Date(deletionStatus.deletion_date!);
    const formattedDate = deletionDate.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Exclusão de conta agendada</p>
            <p className="text-red-700 mt-1">
              Sua conta será deletada em {deletionStatus.days_until_deletion} dias (
              {formattedDate}).
            </p>
            <p className="text-red-700 mt-1">
              Um link de confirmação foi enviado para seu email. Verifique antes do prazo expirar.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Data de exclusão:</strong> {formattedDate}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Dias restantes:</strong> {deletionStatus.days_until_deletion}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            // TODO: Implement cancel deletion endpoint
            toast({
              title: 'Info',
              description: 'Cancelamento de exclusão ainda não implementado',
              variant: 'default',
            });
          }}
          className="w-full"
        >
          Cancelar exclusão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-800">
          <p className="font-medium">Zona de perigo</p>
          <p className="text-red-700 mt-1">
            A exclusão de conta é permanente e irrevogável. Todos os seus dados serão deletados.
          </p>
        </div>
      </div>

      {!showDeleteConfirm ? (
        <Button
          variant="destructive"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Solicitar exclusão de conta
        </Button>
      ) : (
        <form onSubmit={handleSubmitDeletion} className="space-y-6 border-t pt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 font-medium">
              Confirmação necessária
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Para solicitar a exclusão da sua conta, você precisa confirmar sua senha.
              Sua conta será marcada para exclusão e deletada em 7 dias.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Senha
            </label>
            <Input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Sua senha"
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Motivo da exclusão (opcional)
            </label>
            <Textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Nos diga por que você está saindo..."
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setFormData({ password: '', reason: '' });
                setErrors({});
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submittingDeletion}
              className="flex-1"
            >
              {submittingDeletion ? 'Agendando...' : 'Confirmar exclusão'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
