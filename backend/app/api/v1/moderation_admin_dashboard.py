"""
Admin Dashboard API for Content Moderation.
Provides HTML UI and supporting endpoints for moderation management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.content_moderation import (
    get_all_reports,
    get_moderation_statistics,
)

router = APIRouter(prefix="/admin/moderation", tags=["moderation-dashboard"])


def is_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verify user is admin."""
    admin_emails = ["admin@example.com"]  # Configure in settings
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/dashboard", response_class=HTMLResponse)
def moderation_dashboard(
    admin_user: User = Depends(is_admin),
):
    """
    Admin moderation dashboard HTML interface.
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard de Moderação de Conteúdo</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }

            .container {
                max-width: 1400px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
            }

            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
            }

            .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
            }

            .header p {
                opacity: 0.9;
                font-size: 14px;
            }

            .content {
                padding: 30px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }

            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }

            .stat-card h3 {
                font-size: 14px;
                opacity: 0.9;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .stat-card .number {
                font-size: 36px;
                font-weight: bold;
            }

            .controls {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }

            .controls input,
            .controls select,
            .controls button {
                padding: 10px 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                background: white;
                cursor: pointer;
            }

            .controls button {
                background: #667eea;
                color: white;
                border: none;
                font-weight: 600;
                transition: background 0.3s;
            }

            .controls button:hover {
                background: #764ba2;
            }

            .reports-table {
                width: 100%;
                border-collapse: collapse;
                overflow: hidden;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .reports-table thead {
                background: #f7f7f7;
                border-bottom: 2px solid #ddd;
            }

            .reports-table th {
                padding: 15px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                color: #333;
            }

            .reports-table td {
                padding: 15px;
                border-bottom: 1px solid #eee;
            }

            .reports-table tbody tr:hover {
                background: #f9f9f9;
            }

            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .status-open {
                background: #ffeaa7;
                color: #d63031;
            }

            .status-reviewed {
                background: #74b9ff;
                color: #0984e3;
            }

            .status-dismissed {
                background: #a8e6cf;
                color: #27ae60;
            }

            .status-deleted {
                background: #ff7675;
                color: #d63031;
            }

            .reason-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                background: #f0f0f0;
                color: #333;
            }

            .actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .btn-action {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }

            .btn-delete {
                background: #d63031;
                color: white;
            }

            .btn-delete:hover {
                background: #e84e3d;
            }

            .btn-warn {
                background: #fdcb6e;
                color: #333;
            }

            .btn-warn:hover {
                background: #f8b500;
            }

            .btn-dismiss {
                background: #27ae60;
                color: white;
            }

            .btn-dismiss:hover {
                background: #229954;
            }

            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }

            .modal.active {
                display: flex;
            }

            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }

            .modal-header {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #333;
            }

            .modal-body {
                margin-bottom: 20px;
            }

            .modal-body p {
                margin-bottom: 10px;
                color: #666;
            }

            .modal-body textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-family: inherit;
                resize: vertical;
                min-height: 100px;
            }

            .modal-footer {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .modal-footer button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            }

            .btn-cancel {
                background: #ddd;
                color: #333;
            }

            .btn-confirm {
                background: #667eea;
                color: white;
            }

            .pagination {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                justify-content: center;
            }

            .pagination button {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-weight: 600;
            }

            .pagination button.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }

            .empty-state {
                text-align: center;
                padding: 60px 20px;
                color: #999;
            }

            .empty-state h2 {
                margin-bottom: 10px;
                color: #666;
            }

            .loading {
                text-align: center;
                padding: 40px;
                color: #999;
            }

            .alert {
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 6px;
                display: none;
            }

            .alert.show {
                display: block;
            }

            .alert-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }

            .alert-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Dashboard de Moderação de Conteúdo</h1>
                <p>Gerenciamento centralizado de relatórios e ações de moderação</p>
            </div>

            <div class="content">
                <div id="alert" class="alert"></div>

                <div class="stats-grid" id="stats-container">
                    <div class="loading">Carregando estatísticas...</div>
                </div>

                <div class="controls">
                    <input type="text" id="search-message" placeholder="Buscar por ID da mensagem...">
                    <select id="filter-status">
                        <option value="">Todos os Status</option>
                        <option value="open">Aberto</option>
                        <option value="reviewed">Revisado</option>
                        <option value="dismissed">Descartado</option>
                        <option value="deleted">Deletado</option>
                    </select>
                    <select id="filter-reason">
                        <option value="">Todas as Razões</option>
                        <option value="harassment">Assédio</option>
                        <option value="spam">Spam</option>
                        <option value="hate">Discurso de Ódio</option>
                        <option value="sexual">Sexual</option>
                        <option value="violence">Violência</option>
                        <option value="misinformation">Desinformação</option>
                        <option value="copyright">Direitos Autorais</option>
                        <option value="other">Outro</option>
                    </select>
                    <button onclick="loadReports()">Buscar</button>
                </div>

                <div id="reports-container">
                    <div class="loading">Carregando relatórios...</div>
                </div>

                <div id="pagination-container"></div>
            </div>
        </div>

        <div id="action-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header" id="modal-title">Ação de Moderação</div>
                <div class="modal-body">
                    <p id="modal-message"></p>
                    <label>Motivo:</label>
                    <textarea id="action-reason" placeholder="Explique brevemente o motivo desta ação..."></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
                    <button class="btn-confirm" onclick="confirmAction()">Confirmar</button>
                </div>
            </div>
        </div>

        <script>
            const API_BASE = '/api/v1';
            let currentAction = null;
            let currentReportId = null;
            let currentPage = 1;

            async function loadStatistics() {
                try {
                    const response = await fetch(`${API_BASE}/content/admin/statistics`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    const stats = await response.json();

                    const container = document.getElementById('stats-container');
                    container.innerHTML = `
                        <div class="stat-card">
                            <h3>Total de Relatórios</h3>
                            <div class="number">${stats.total_reports}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Abertos</h3>
                            <div class="number" style="color: #ffeaa7;">${stats.open_reports}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Revisados</h3>
                            <div class="number">${stats.reviewed_reports}</div>
                        </div>
                        <div class="stat-card">
                            <h3>Deletados</h3>
                            <div class="number">${stats.deleted_reports}</div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Erro ao carregar estatísticas:', error);
                }
            }

            async function loadReports() {
                const status = document.getElementById('filter-status').value;
                const reason = document.getElementById('filter-reason').value;
                const container = document.getElementById('reports-container');

                container.innerHTML = '<div class="loading">Carregando relatórios...</div>';

                try {
                    let url = `${API_BASE}/content/admin/reports?skip=0&limit=50`;
                    if (status) url += `&status=${status}`;
                    if (reason) url += `&reason=${reason}`;

                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) throw new Error('Erro ao carregar relatórios');

                    const reports = await response.json();

                    if (reports.length === 0) {
                        container.innerHTML = '<div class="empty-state"><h2>Nenhum relatório encontrado</h2><p>Comece quando os usuários reportarem conteúdo</p></div>';
                        return;
                    }

                    let html = `
                        <table class="reports-table">
                            <thead>
                                <tr>
                                    <th>ID Mensagem</th>
                                    <th>Reporter</th>
                                    <th>Motivo</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    for (const report of reports) {
                        const statusClass = `status-${report.status}`;
                        const statusText = {
                            'open': 'Aberto',
                            'reviewed': 'Revisado',
                            'dismissed': 'Descartado',
                            'deleted': 'Deletado'
                        }[report.status] || report.status;

                        const reasonText = {
                            'harassment': 'Assédio',
                            'spam': 'Spam',
                            'hate': 'Discurso de Ódio',
                            'sexual': 'Sexual',
                            'violence': 'Violência',
                            'misinformation': 'Desinformação',
                            'copyright': 'Direitos Autorais',
                            'other': 'Outro'
                        }[report.reason] || report.reason;

                        const date = new Date(report.created_at).toLocaleDateString('pt-BR');
                        const actions = report.status === 'open' ? `
                            <button class="btn-action btn-delete" onclick="openModal('deleted', ${report.id}, 'Deletar Conteúdo')">Deletar</button>
                            <button class="btn-action btn-warn" onclick="openModal('warned_user', ${report.id}, 'Avisar Usuário')">Avisar</button>
                            <button class="btn-action btn-dismiss" onclick="openModal('dismiss', ${report.id}, 'Descartar')">Descartar</button>
                        ` : '<span style="color: #999;">Já processado</span>';

                        html += `
                            <tr>
                                <td><code>${report.message_id}</code></td>
                                <td>${report.reporter_email}</td>
                                <td><span class="reason-badge">${reasonText}</span></td>
                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                <td>${date}</td>
                                <td><div class="actions">${actions}</div></td>
                            </tr>
                        `;
                    }

                    html += '</tbody></table>';
                    container.innerHTML = html;
                } catch (error) {
                    container.innerHTML = `<div class="empty-state"><h2>Erro</h2><p>${error.message}</p></div>`;
                }
            }

            function openModal(action, reportId, title) {
                currentAction = action;
                currentReportId = reportId;
                document.getElementById('modal-title').textContent = title;
                document.getElementById('action-reason').value = '';
                document.getElementById('action-modal').classList.add('active');
            }

            function closeModal() {
                document.getElementById('action-modal').classList.remove('active');
            }

            async function confirmAction() {
                const reason = document.getElementById('action-reason').value.trim();

                if (!reason || reason.length < 10) {
                    showAlert('Por favor, forneça um motivo com pelo menos 10 caracteres', 'error');
                    return;
                }

                try {
                    let url, method, body;

                    if (currentAction === 'dismiss') {
                        url = `${API_BASE}/content/admin/reports/${currentReportId}/dismiss?reason=${encodeURIComponent(reason)}`;
                        method = 'PUT';
                    } else {
                        url = `${API_BASE}/content/admin/reports/${currentReportId}/action`;
                        body = {
                            action: currentAction,
                            reason: reason
                        };
                        method = 'PUT';
                    }

                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: body ? JSON.stringify(body) : undefined
                    });

                    if (!response.ok) throw new Error('Erro ao processar ação');

                    closeModal();
                    showAlert('Ação processada com sucesso!', 'success');
                    loadReports();
                    loadStatistics();
                } catch (error) {
                    showAlert(`Erro: ${error.message}`, 'error');
                }
            }

            function showAlert(message, type) {
                const alert = document.getElementById('alert');
                alert.textContent = message;
                alert.className = `alert show alert-${type}`;
                setTimeout(() => {
                    alert.classList.remove('show');
                }, 5000);
            }

            // Initialize
            window.addEventListener('load', () => {
                loadStatistics();
                loadReports();
                setInterval(loadStatistics, 30000);
            });
        </script>
    </body>
    </html>
    """
    return html_content
