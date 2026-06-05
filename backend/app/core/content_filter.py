"""
Content Moderation Filter - Detecção de palavras proibidas
Pode ser expandido para AI-based moderation (OpenAI API, Perspective API, etc)
"""

from typing import List, Dict, Tuple
import re

# Lista básica de palavras proibidas/banidas
# TODO: Expandir com mais palavras ou usar API externa (Perspective, OpenAI Moderation)
BANNED_WORDS = [
    # Insultos/ofensas (exemplos genéricos - adicionar palavras locais)
    "insulto1",
    "insulto2",
    "palavra_proibida",
]

# Padrões regex para detecção de spam
SPAM_PATTERNS = [
    r"(.)\1{4,}",  # Repetição de caracteres (aaaaaaa)
    r"(https?://|www\.)\S+",  # URLs
    r"\b\d{3,}\b",  # Números longos
]

# Configurações
MODERATION_CONFIG = {
    "enable_banned_words": True,
    "enable_spam_detection": True,
    "case_sensitive": False,
    "min_confidence_ban": 0.8,  # 80% de confiança para banir
}


class ContentModerator:
    """
    Sistema de moderação de conteúdo.
    Pode ser usado para validar mensagens, comentários, etc.
    """

    def __init__(self, banned_words: List[str] = None):
        """
        Initialize moderator.

        Args:
            banned_words: Lista customizada de palavras banidas
        """
        self.banned_words = banned_words or BANNED_WORDS
        if not MODERATION_CONFIG["case_sensitive"]:
            self.banned_words = [w.lower() for w in self.banned_words]

    def check_banned_words(self, text: str) -> Tuple[bool, List[str]]:
        """
        Verificar se texto contém palavras banidas.

        Returns:
            (is_banned, found_words)
        """
        if not MODERATION_CONFIG["enable_banned_words"]:
            return False, []

        check_text = text if MODERATION_CONFIG["case_sensitive"] else text.lower()
        found = []

        for word in self.banned_words:
            # Usar regex para encontrar palavra inteira (não substring)
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, check_text):
                found.append(word)

        return len(found) > 0, found

    def check_spam(self, text: str) -> Tuple[bool, List[str]]:
        """
        Detectar padrões de spam no texto.

        Returns:
            (is_spam, matched_patterns)
        """
        if not MODERATION_CONFIG["enable_spam_detection"]:
            return False, []

        matched = []
        for pattern in SPAM_PATTERNS:
            if re.search(pattern, text):
                matched.append(pattern)

        return len(matched) > 0, matched

    def moderate(self, text: str) -> Dict:
        """
        Executar moderação completa no texto.

        Returns:
            {
                'is_clean': bool,
                'severity': 'safe' | 'warning' | 'blocked',
                'flags': {
                    'banned_words': [...],
                    'spam_patterns': [...]
                }
            }
        """
        has_banned, banned_found = self.check_banned_words(text)
        has_spam, spam_found = self.check_spam(text)

        flags = {
            'banned_words': banned_found,
            'spam_patterns': spam_found,
        }

        # Determinar severidade
        if has_banned:
            severity = 'blocked'  # Banir imediatamente
        elif has_spam:
            severity = 'warning'  # Avisar mas permitir
        else:
            severity = 'safe'

        return {
            'is_clean': severity == 'safe',
            'severity': severity,
            'flags': flags,
            'should_block': severity == 'blocked',
            'should_warn': severity == 'warning',
        }


# Instância global
moderator = ContentModerator()


# Funções de conveniência
def check_content(text: str) -> bool:
    """
    Verificar se conteúdo é válido.

    Returns:
        True se conteúdo deve ser bloqueado
    """
    result = moderator.moderate(text)
    return result['should_block']


def moderate_content(text: str) -> Dict:
    """
    Fazer moderação de conteúdo.

    Returns:
        Dict com resultado detalhado
    """
    return moderator.moderate(text)


def add_banned_word(word: str):
    """Adicionar palavra à lista de banidas"""
    if word not in moderator.banned_words:
        moderator.banned_words.append(word)


def remove_banned_word(word: str):
    """Remover palavra da lista de banidas"""
    if word in moderator.banned_words:
        moderator.banned_words.remove(word)


def get_banned_words() -> List[str]:
    """Retornar lista de palavras banidas"""
    return moderator.banned_words.copy()


# Exemplo de uso:
if __name__ == "__main__":
    # Testes rápidos
    test_texts = [
        "Olá, tudo bem?",  # Clean
        "insulto1 você é ruim",  # Banned word
        "aaaaaaaa spam spam spam",  # Spam
        "Visite https://malware.com agora",  # Spam (URL)
    ]

    for text in test_texts:
        result = moderate_content(text)
        print(f"Text: '{text}'")
        print(f"Result: {result}\n")
