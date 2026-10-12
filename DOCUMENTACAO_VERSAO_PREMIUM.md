# Anote Você — Documento de Adaptação para Versão Premium (v3)

> **Data:** 12/10/2026
> **Status:** Especificação de implementação
> **Substitui:** Documento de reconstrução base + Guia Definitivo + adendo v2 + manual de telas

---

## 1. Introdução: do app atual ao Premium

### 1.1 O que este documento faz

Este documento adapta a especificação completa de reconstrução do AnoteVocê para a **versão Premium**, conforme a especificação v3 do produto. Ele define:

- **O que muda** entre o app atual (React + Capacitor, identidade visual estilo Apple, sem monetização) e a versão Premium (Android nativo Kotlin + Jetpack Compose, identidade própria, sistema de cobrança).
- **O que permanece** (fluxos, lógica de negócio, modelo de dados conceitual).
- **O que é novo** (paywall, limites grátis, bloqueio por senha/biometria, capas de pasta, backup Drive, scanner).
- **O que é removido** (moldura de iPhone, identidade Apple, desenho à mão, pastas inteligentes).

### 1.2 Resumo das mudanças estruturais

| Dimensão | App atual (reconstrução) | Versão Premium (v3) |
|---|---|---|
| **Stack** | React 19 + TypeScript + Vite + Tailwind + Capacitor | Kotlin + Jetpack Compose (Material 3) |
| **Plataforma** | Android via Capacitor (web wrapper) | Android nativo (minSdk 26, targetSdk 36) |
| **Persistência** | localStorage | Room (SQLite) + DataStore |
| **Editor** | contentEditable (DOM) | Modelo próprio de blocos em Compose |
| **Identidade visual** | Inspirada em Apple (âmbar #E49F13/#D97706, SF Pro, moldura iPhone) | Própria (verde-azulada #1F7A6D, Roboto/Inter, Material 3) |
| **Monetização** | Nenhuma | RevenueCat + Google Play Billing |
| **Bloqueio de notas** | SHA-256 por nota (não premium) | AES-GCM por nota + biometria (Premium) |
| **Backup** | Arquivo JSON local/compartilhável | Arquivo .anotevoce local + Google Drive (Premium) |
| **Scanner** |getUserMedia (não premium) | ML Kit Document Scanner (Premium) |
| **Capas de pasta** | Não existe | Photo Picker + armazenamento interno (Premium) |

### 1.3 Princípios Premium

1. **Um único ponto de controle** (`PremiumGate`) — nenhuma tela consulta a loja diretamente.
2. **Nunca bloquear o que já existe** — ao perder o Premium, dados continuam visíveis/editáveis; apenas novas criações premium são bloqueadas.
3. **Preços vêm da loja** — nunca fixos no código.
4. **Sem anúncios, sem servidor próprio** — privacidade por design.
5. **Compra única além de assinaturas** — plano vitalício.

---

## 2. Tabela de transição: atual → Premium

### 2.1 Recursos que mudam

| Recurso | App atual | Versão Premium |
|---|---|---|
| Bloqueio de notas | Grátis (SHA-256) | **Premium** (AES-GCM + biometria) |
| Escanear documentos | Grátis (getUserMedia) | **Premium** (ML Kit) |
| Fixar notas | Grátis (togglePin) | **Premium** |
| Capas de pasta | Não existe | **Premium** (novo) |
| Backup local | Grátis (JSON) | Grátis (formato .anotevoce) |
| Backup Drive | Não existe | **Premium** (novo) |
| Tabelas | Sem limite | **Grátis até 3×3**, Premium ilimitado (10×100) |
| Pastas | Sem limite | **Grátis até 7**, Premium ilimitadas |
| Avatar | Grátis (foto + transform) | Grátis (Photo Picker) |
| Lixeira | Grátis (30 dias) | Grátis (30 dias) |
| Formatação | Grátis | Grátis |
| Checklist | Grátis | Grátis |
| Compartilhar nota | Grátis | Grátis |
| Busca | Grátis | Grátis |
| Seleção múltipla | Grátis | Grátis |

### 2.2 Recursos que permanecem iguais (mas com identidade nova)

- Pastas CRUD
- Notas CRUD
- Lixeira com restauração
- Checklist com auto-sort
- Formatação de texto (hierarchy, B/I/U/S, listas, indent)
- Tabelas (com limite grátis)
- Buscar na nota
- Mover notas
- Desfazer/refazer
- Auto-lock ao sair

### 2.3 Recursos removidos

| Recivo | Motivo |
|---|---|
| Desenho à mão (Apple PencilKit-style) | Removido do app (seção 2 v3) |
| Pastas inteligentes | Fora do lançamento |
| Subpastas | Fora do lançamento |
| "Ver anexos" | Fora do lançamento |
| Fundo pautado (linhas) | Fora do lançamento |
| OneDrive / Mega | Só Google Drive |
| Moldura iPhone (preview web) | Identity própria, sem moldura |
| Cores âmbar #E49F13/#D97706 | Substituídas por #1F7A6D |

---

## 3. Identidade visual Premium

### 3.1 Cores

| Token | Hex | Uso |
|---|---|---|
| Cor-semente (primary) | `#1F7A6D` | Destaque principal, botões, links |
| Primary clara (tema claro) | Gerada pelo Material 3 a partir da semente | Superfícies |
| Primary escura (tema escuro) | Gerada pelo Material 3 | Superfícies |
| Background | Claro: `#FEF7FF` / Escuro: `#1D1B20` | Fundo das telas |
| On-background | Claro: `#1D1B20` / Escuro: `#E6E0E9` | Texto principal |
| Outline | Claro: `#79747E` / Escuro: `#938F99` | Bordas/divisores |
| Error | `#B3261E` | Ações destrutivas |
| Surface variant | Material 3 | Cards, sheets |

**Proibido:** âmbar #E49F13, #D97706 e parecidas.

### 3.2 Tipografia

- **Fonte:** Roboto (padrão do Android) ou Inter (sem embutir arquivos).
- **Escala:** Material 3 (display, headline, title, body, label — em sp).
- **Proibido:** SF Pro / San Francisco.

### 3.3 Componentes

- Material 3: menus, diálogos, bottom sheets, snackbars, FABs, top app bars.
- Alvos de toque ≥ 48 dp.
- Tema claro e escuro.
- **Proibido:** vidro fosco estilo iOS, alertas iOS, Dynamic Island, home indicator desenhado pelo app.

### 3.4 Ícones do app

- Ícone próprio PNG 512×512.
- Material Symbols (Apache 2.0).
- **Proibido:** SF Symbols, ícones da Apple.

---

## 4. Arquitetura Premium

### 4.1 Stack

| Camada | Escolha |
|---|---|
| Linguagem | Kotlin |
| UI | Jetpack Compose (Material 3) |
| Banco de dados | Room (SQLite) |
| Preferências | DataStore |
| Editor | Modelo próprio de blocos desenhado em Compose |
| Bloqueio | AES-256-GCM + chave derivada da senha (Argon2id/PBKDF2) + BiometricPrompt |
| Scanner | ML Kit Document Scanner |
| Backup local | Seletor de arquivos do sistema (SAF) |
| Nuvem | Google Drive (appDataFolder, escopo drive.appdata) |
| Cobrança | RevenueCat sobre Google Play Billing |
| Tarefas em segundo plano | WorkManager (backup automático opcional) |
| Ofuscação | R8 ativo em release |
| minSdk | 26 |
| targetSdk | 36 (Android 16) |

### 4.2 Proibido

- Servidores próprios
- Firebase / AWS
- SDK de anúncios
- Qualquer ferramenta que envie conteúdo de notas para fora do aparelho (exceto backup Drive e dados de compra)

### 4.3 Fluxo de dados

```
Usuário escreve → Room (SQLite) → Aparelho
                              ↓
Backup (Premium) → Google Drive (appDataFolder)
Dados de compra → Google Play Billing → RevenueCat
```

---

## 5. Modelo de dados Premium

### 5.1 Tabelas Room

#### Folder

| Campo | Tipo | Observações |
|---|---|---|
| id | String (PK) | UUID |
| name | String | Até 40 caracteres |
| coverPath | String? | Path interno da imagem (Premium) |
| position | Int | Ordem na lista |
| isDefault | Boolean | true = pasta "Notas" (não apagável) |
| createdAt | Long | Timestamp |

#### Note

| Campo | Tipo | Observações |
|---|---|---|
| id | String (PK) | UUID |
| folderId | String (FK) | → Folder.id |
| title | String | Visível mesmo bloqueada |
| contentJson | String | Blocos do editor (vazio se bloqueada) |
| plainText | String | Para busca (vazio se bloqueada) |
| isPinned | Boolean | Premium |
| pinnedAt | Long? | Para ordenação |
| isLocked | Boolean | Premium |
| cipherText | String? | Conteúdo cifrado AES-GCM (se bloqueada) |
| iv | String? | IV único por nota |
| createdAt | Long | |
| updatedAt | Long | |
| deletedAt | Long? | Null = ativa; preenchido = lixeira |

#### Attachment

| Campo | Tipo | Observações |
|---|---|---|
| id | String (PK) | UUID |
| noteId | String (FK) | → Note.id |
| path | String | Path interno |
| type | String | "scan" ou "imagem" |
| createdAt | Long | |

### 5.2 DataStore (preferências)

| Chave | Tipo | Observações |
|---|---|---|
| view_mode | String | "list" ou "blocks" |
| theme | String | "light", "dark", "system" |
| auto_sort_checklist | Boolean | Mover itens marcados para o fim |
| avatar_path | String? | Foto do perfil |
| last_backup_at | Long? | |
| lock_salt | String? | Sal da derivação |
| lock_params | String? | Parâmetros Argon2id/PBKDF2 |
| lock_verifier | String? | Para verificar senha |
| lock_hint | String? | Dica |
| biometric_enabled | Boolean | Biometria ativa |

### 5.3 Blocos do editor (contentJson)

```json
{
  "blocks": [
    { "type": "title", "text": "...", "styles": {} },
    { "type": "heading", "text": "...", "styles": {} },
    { "type": "subheading", "text": "...", "styles": {} },
    { "type": "paragraph", "text": "...", "styles": {} },
    { "type": "bullet", "text": "...", "indent": 0 },
    { "type": "dash", "text": "...", "indent": 0 },
    { "type": "numbered", "text": "...", "number": 1, "indent": 0 },
    { "type": "checklist", "text": "...", "checked": false },
    { "type": "table", "columns": 2, "rows": 3, "cells": [["",""],["",""]] },
    { "type": "image", "attachmentId": "uuid" }
  ]
}
```

Estilos inline: bold, italic, underline, strikethrough.

### 5.4 Limites que o código consulta

| Constante | Valor grátis | Valor Premium |
|---|---|---|
| MAX_FREE_FOLDERS | 7 | Int.MAX_VALUE |
| MAX_FREE_TABLE_COLS | 3 | 10 |
| MAX_FREE_TABLE_ROWS | 3 | 100 |

---

## 6. Sistema Premium: `PremiumGate`

### 6.1 Conceito

Um único componente que responde "este usuário é Premium?":

```kotlin
class PremiumGate(
    private val revenueCat: RevenueCatService
) {
    val isPremium: StateFlow<Boolean> = revenueCat.entitlementFlow("premium")
    
    fun requirePremium(context: Context, feature: PremiumFeature) {
        if (!isPremium.value) {
            context.startActivity(OfferWallActivity::class.java.apply {
                putExtra("feature", feature.name)
            })
        }
    }
}

enum class PremiumFeature {
    UNLIMITED_FOLDERS,
    TABLE_UNLIMITIZED,
    PIN_NOTE,
    LOCK_NOTE,
    SCAN_DOCUMENT,
    FOLDER_COVER,
    DRIVE_BACKUP
}
```

### 6.2 Regras de bloqueio

| Recurso | Grátis | Ao exceder |
|---|---|---|
| Criar 8ª pasta | Bloqueado | Abre tela de ofertas (contexto: capas) |
| Adicionar 4ª coluna na tabela | Bloqueado | Abre tela de ofertas |
| Adicionar 4ª linha na tabela | Bloqueado | Abre tela de ofertas |
| Fixar nota (botão/swipe) | Bloqueado | Abre tela ofertas |
| Bloquear nota | Bloqueado | Abre tela ofertas |
| Escanear | Bloqueado | Abre tela ofertas |
| Alterar capa | Bloqueado | Abre tela ofertas |
| Backup Drive | Bloqueado | Abre tela ofertas |

### 6.3 Quando o Premium termina

**Nunca apagar nem esconder dados.** O que já existe continua visível e editável:
- Pastas além da 7ª continuam acessíveis
- Capas continuam visíveis
- Tabelas maiores que 3×3 continuam editáveis
- Notas fixadas continuam no topo
- Notas bloqueadas continuam abertas com a senha

O que deixa de funcionar:
- Criar nova pasta acima do limite
- Criar novo bloqueio
- Criar novo scan
- Criar nova capa
- Criar novo backup no Drive

Restaurar backup do Drive já feito continua permitido.

### 6.4 Debug switch

Em build debug, um interruptor (ex.: no DataStore ou BuildConfig) liga/desliga o Premium para testes:

```kotlin
val isPremium = if (BuildConfig.DEBUG) {
    debugOverride ?: revenueCat.entitlementFlow("premium").value
} else {
    revenueCat.entitlementFlow("premium").value
}
```

---

## 7. Telas Premium: o que muda

### 7.1 Tela inicial (Pastas)

| Elemento | Atual | Premium |
|---|---|---|
| Avatar | 48px com anel âmbar | 64 dp circular, ilustração padrão original (sem 👤 emoji) |
| Saudação | "Bom dia/tarde/noite, nome" | "Olá" + "Suas pastas" |
| Menu | Não existe | 3 pontos: "Lixeira" + "Configurações" |
| Linha fixa | Todas (system root) | "Todas as notas" sempre primeiro, visão virtual |
| Capa da pasta | Não existe | Miniatura quadrada 48 dp (Premium) ou ícone neutro |
| Limite | Não existe | 7 pastas grátis; 8ª abre ofertas |
| Barra inferior | Nova pasta + Nova nota | Ímesmo, mas com gate |
| Toque longo | Não existe | Renomear / Alterar capa (Premium) / Apagar |

### 7.2 Lista de notas

| Elemento | Atual | Premium |
|---|---|---|
| Seções | Hoje / Ontem / 7 Dias / Anteriores | + "Últimos 30 dias" e depois por mês/ano |
| Busca | Oculta bloqueadas | Só título das bloqueadas (não busca no corpo) |
| Fixadas | Grátis | Premium |
| Swipe right | Grátis (fixar) | Premium (grátis abre ofertas) |
| Swipe left | Não existe | Apaga (com snackbar "Desfazer") |
| Modo blocos | Grátis | Grátis |
| Rodapé | Contador + Bloquear Agora | Mesmo |

### 7.3 Editor de nota

| Elemento | Atual | Premium |
|---|---|---|
| Barra superior | Font size, undo, redo, share, mais, OK | Voltar + pasta, Compartilhar, 3 pontos |
| Barra de acessórios | Table, Aa, Checklist, Camera, Cor, X | Tabela, Aa, Checklist, Escanear (Premium selo), Fechar |
| Fundo pautado | Grátis | **Removido** |
| Cor da página | Grátis | **Removido** |
| Tamanho da letra | Session-only | **Removido** |
| Rich text (cores) | Grátis | **Removido** (apenas B/I/U/S/hierarchy/listas/indent) |
| Desfazer/refazer | Global do corpo | Manter (session-only) |
| Salvamento | Debounce 300ms | Auto-save a cada pausa de digitação |

### 7.4 Menu da nota (3 pontos)

| Item | Atual | Premium |
|---|---|---|
| Escanear | Grátis | Premium (selo "Premium") |
| Fixar | Grátis | Premium (selo) |
| Bloquear | Grátis | Premium (selo) |
| Buscar na nota | Grátis | Grátis |
| Mover nota | Grátis | Grátis |
| Linhas | Grátis | **Removido** |
| Apagar | Grátis | Grátis |

### 7.5 Tela de ofertas (Paywall) — NOVO

**Abertura:** ao tentar usar qualquer recurso Premium.

**Conteúdo:**
- Frase de impacto (rotacionar entre 4 opções)
- Lista de benefícios (7 itens)
- 3 planos com preço da loja:
  - Mensal: R$ 9,90/mês
  - Anual: R$ 49,90/ano (R$ 4,15/mês) — destaque "melhor custo-benefício"
  - Vitalício: R$ 99,90 — pagamento único
- Botão "Continuar" (abre fluxo de compra)
- Botão "Restaurar compras"
- Aviso: "Cancele quando quiser em Play Store > Pagamentos e assinaturas > Assinaturas"
- Texto de contexto (ex.: "Esqueça os ícones cinzas..." quando vier de capa)

**Frases de impacto:**
1. "Dê identidade às suas listas: altere a imagem das pastas para os lugares que você frequenta."
2. "Organização visual inteligente: crie pastas para faculdade, compras ou postos e mude o visual delas como quiser."
3. "Transforme suas pastas em atalhos visuais usando imagens da sua galeria."
4. "Chega de pastas sem graça. Dê vida e reconhecimento instantâneo às suas notas."

### 7.6 Configurações — NOVO

| Seção | Itens |
|---|---|
| Perfil | Avatar (Photo Picker), Remover foto |
| Editor | "Mover itens marcados para o fim" |
| Aparência | Tema: Claro / Escuro / Sistema |
| Bloqueio | "Alterar senha", "Usar impressão digital" (se houver senha) |
| Backup | Abre tela de backup |
| Lixeira | Atalho |
| Premium | "Ver planos", "Restaurar compras", "Você é Premium" (se ativo) |
| Sobre | Versão, política de privacidade, e-mail suporte |

### 7.7 Tela de Backup — NOVO

**Grátis:**
- "Exportar backup" (SAF)
- "Importar backup" (valida antes, substitui tudo com confirmação)

**Premium:**
- "Conectar ao Google Drive"
- "Fazer backup agora"
- "Restaurar do Drive"
- Data do último backup
- Aviso obrigatório sobre pasta oculta

### 7.8 Capa da pasta — NOVO

- "Alterar capa" → Photo Picker
- Recorte quadrado ou 16:9
- Reduzida e copiada para armazenamento interno
- "Remover capa" volta ao ícone neutro

---

## 8. Bloqueio de notas Premium (substitui SHA-256)

### 8.1 Diferenças

| Aspecto | Atual (SHA-256) | Premium (AES-GCM) |
|---|---|---|
| Chave | Derivada da senha por hash (20000× SHA-256) | Derivada da senha (Argon2id/PBKDF2) |
| Armazenamento | Só hash + salt | Salt + params + verificador + IV por nota |
| Cifra | Nenhum (conteúdo em hash) | AES-256-GCM (conteúdo cifrado) |
| Biometria | Não | BiometricPrompt como atalho |
| Backup | Hash viaja | Cifrado viaja; abre com senha em outro aparelho |
| Troca de senha | Recria hash | Recifra todas as notas |

### 8.2 Fluxo de cifra

1. Criar senha → gera salt → deriva chave 256-bit → guarda {salt, params, verifier}
2. Cifrar nota → AES-256-GCM com IV aleatório por nota → guarda {cipherText, IV}
3. Biometria → chave do Keystore envolve a chave derivada → só desbloqueia no aparelho
4. Backup → leva cifrado + salt + params (não leva biometria)
5. Trocar senha → pede atual → deriva nova → recifra tudo

### 8.3 Segurança de tela

- `FLAG_SECURE` em telas de nota bloqueada (sem captura, sem prévia em recentes)

---

## 9. Backup Premium

### 9.1 Formato

Arquivo único `.anotevoce` (pacote compactado):
- `manifest.json` (versão, data, versão app)
- Dados de pastas e notas
- Anexos e imagens de avatar/capas
- Notas bloqueadas seguem cifradas

### 9.2 Regras

- Validação antes de tocar dados atuais
- Formato mais novo que app → recusa com mensagem
- Restauração atômica (se falhar, dados atuais intactos)
- Drive: appDataFolder, escopo `drive.appdata`
- Restaurar do Drive permitido mesmo sem Premium

---

## 10. Cobrança Premium

### 10.1 Produtos

| ID | Tipo | Preço |
|---|---|---|
| `anotevoce_mensal` | Assinatura | R$ 9,90/mês |
| `anotevoce_anual` | Assinatura | R$ 49,90/ano |
| `anotevoce_vitalicio` | Compra única (não consumível) | R$ 99,90 |

### 10.2 Receita líquida (após 15% Google)

| Plano | Bruto | Líquido |
|---|---|---|
| Mensal | R$ 9,90 | ~R$ 8,42 |
| Anual | R$ 49,90 | ~R$ 42,42 |
| Vitalício | R$ 99,90 | ~R$ 84,92 |

### 10.3 Taxas

- Google Play: 15% (assinaturas e compras únicas até US$ 1M/ano)
- RevenueCat: gratuito até US$ 2.500/mês receita acompanhada; 1% depois
- Conta desenvolvedor: US$ 25 única
- Impostos: fora

---

## 11. Ordem de construção (adaptação)

### Fase 1: Auditoria e identidade (~1 semana)
- [ ] Definir appId (ex.: `br.com.seunome.anotevoce`)
- [ ] Trocar cor primária para #1F7A6D
- [ ] Trocar fonte para Roboto/Inter
- [ ] Trocar ícones para Material Symbols
- [ ] Remover moldura iPhone do preview web
- [ ] Remover todos os textos/ícones/cores Apple
- [ ] Confirmar targetSdk 36

### Fase 2: Dados (Room + DataStore) (~1 semana)
- [ ] Criar entidades Folder, Note, Attachment
- [ ] Criar DAOs
- [ ] Criar DataStore
- [ ] Migrar dados existentes (localStorage → Room)

### Fase 3: Telas gratuitas + editor (~2 semanas)
- [ ] Tela inicial (Pastas)
- [ ] Nova pasta
- [ ] Lista de notas (lista + blocos)
- [ ] Seleção múltipla
- [ ] Editor de nota (blocos próprios)
- [ ] Checklist
- [ ] Tabelas (limite 3×3)
- [ ] Formatar (hierarchy, B/I/U/S, listas, indent)

### Fase 4: Avatar e capas (~3 dias)
- [ ] Avatar via Photo Picker
- [ ] Capas de pasta (Premium)

### Fase 5: PremiumGate (~2 dias)
- [ ] Integrar RevenueCat
- [ ] Criar PremiumGate
- [ ] Aplicar gates (pastas, tabela, fixar, bloquear, escanear, capa, Drive)

### Fase 6: Cobrança (~3 dias)
- [ ] Tela de ofertas
- [ ] 3 produtos no Play Console
- [ ] Receber preços da loja
- [ ] "Restaurar compras"

### Fase 7: Recursos Premium (~1 semana)
- [ ] Bloqueio de notas (AES-GCM + biometria)
- [ ] Escanear (ML Kit)
- [ ] Fixar notas

### Fase 8: Backup (~3 dias)
- [ ] Exportar/importar local (.anotevoce)
- [ ] Backup Google Drive (Premium)

### Fase 9: Qualidade (~2 semanas)
- [ ] Testes manuais
- [ ] Testes automatizados (seção 12 v3)
- [ ] 10 dias uso real

### Fase 10: Lançamento (~1 semana)
- [ ] Play App Signing
- [ ] Gerar .aab
- [ ] Play Console (declarações, produtos, ficha)
- [ ] Teste fechado (12 testadores, 14 dias)
- [ ] Solicitar produção
- [ ] Lançamento gradual (20%)

**Total estimado:** ~11 semanas (app existente reduz para ~6-8 semanas)

---

## 12. Checklist de verificação premium

| Item | Critério |
|---|---|
| Limite de pastas | 7 grátis; 8ª abre ofertas; existentes intactas |
| Limite da tabela | 3×3 grátis; 4ª abre ofertas |
| Fixar | Grátis: botão/gesto abrem ofertas |
| Bloqueio | Senha ou biometria; título visível; corpo cifrado |
| Backup local | Exportar/importar restaura tudo |
| Backup Drive | Mesmo resultado, conta Google |
| Premium termina | Nada apagado; só criação bloqueada |
| Compras | Teste libera Premium; restauração funciona |
| Aparência | Claro/escuro, 48 dp, contraste |
| Originalidade | Zero elementos Apple no app e capturas |
| Cobrança | Preço da loja, nunca no código |
| Privacidade | Sem servidor; só Drive + billing |

---

## 13. Publicação

### 13.1 Ficha da loja

- **Nome:** Anote Você: Bloco de Notas (26 caracteres)
- **Descrição curta (79):** Bloco de notas limpo, moderno e com pastas personalizadas para o seu dia a dia.
- **Descrição longa:** Ver seção 13 do documento v3.
- **Ícone:** PNG 512×512
- **Gráfico de recursos:** 1024×500
- **Capturas:** 2–8, pastas genéricas (Supermercado, Posto, Faculdade, Livraria), sem marcas reais

### 13.2 Teste fechado

- Conta pessoal pós-13/11/2023: 12 testadores, 14 dias seguidos
- Conta organização: sem exigência, mas D-U-N-S

### 13.3 Política de privacidade

- URL pública obrigatória (GitHub Pages, Notion público)
- Declarar: sem servidor próprio, Google Play Billing, RevenueCat, Google Drive, ML Kit
- Formulário de segurança de dados: declarar dados de compra

---

## 14. Resumo das modificações no código atual

Se o app React + Capacitor for mantido como base (adaptação em vez de reescrita):

| Arquivo | Ação |
|---|---|
| `src/index.css` | Trocar variáveis de cor para Material 3 (#1F7A6D), remover moldura, remover scrollbar custom |
| `src/types/notes.ts` | Adicionar `coverPath` em Folder; adicionar `cipherText`/`iv` em Note; remover `pageBackground`/`pageColor`/`bodySpans`/`drawingDataUrl` |
| `src/hooks/useNotesStorage.ts` | Adicionar `premiumGate`, `isPremium`, `MAX_FREE_FOLDERS=7`, `MAX_FREE_TABLE_COLS/ROWS=3`; gate em `createFolder`, `handleInsertTable`, `togglePin`, `setNoteLock`, `handleInsertChecklist`(auto) |
| `src/utils/lock.ts` | Substituir SHA-256 por AES-256-GCM + Argon2id/PBKDF2; adicionar biometria |
| `src/utils/backup.ts` | Mudar formato para `.anotevoce` com manifest; adicionar Drive |
| `src/utils/storage.ts` | Migrar para Room/DataStore (ou manter localStorage como cache) |
| `src/components/folders/FoldersView.tsx` | Remover moldura; adicionar capa; adicionar gate de 7 pastas; adicionar menu 3 pontos (Lixeira/Configurações) |
| `src/components/notes/NotesListView.tsx` | Adicionar seções "Últimos 30 dias" e por mês/ano; swipe left para apagar; gate em fixar |
| `src/components/editor/NoteEditorView.tsx` | Remover cores de página/linhas/tamanho; adicionar selo Premium nos botões; gate |
| `src/components/security/SetPasswordModal.tsx` | Adicionar aviso "sem recuperação"; integrar com AES-GCM |
| `src/components/security/PasscodePromptModal.tsx` | Adicionar biometria |
| `src/components/profile/ProfileCard.tsx` | Photo Picker; mover para Configurações |
| **NOVO** | `src/components/premium/OfferWall.tsx` (tela de ofertas) |
| **NOVO** | `src/components/premium/PremiumGate.tsx` (controle central) |
| **NOVO** | `src/components/settings/SettingsView.tsx` |
| **NOVO** | `src/components/backup/BackupView.tsx` |
| **NOVO** | `src/components/folders/FolderCoverSheet.tsx` |
| **NOVO** | `src/utils/billing.ts` (RevenueCat) |
| **NOVO** | `src/utils/drive.ts` (Google Drive) |
| **NOVO** | `src/utils/scanner.ts` (ML Kit) |
| **REMOVER** | `IPhoneFrame`, `HomeIndicator` (identidade Apple) |
| **REMOVER** | `drawingDataUrl`, `pageBackground`, `pageColor`, `bodySpans` de Note |

---

## 15. Decisões pendentes de confirmação com o dono

1. **AppId final:** `br.com.seunome.anotovoce` (proposto) — confirmar domínio.
2. **Cor-semente:** `#1F7A6D` (proposta) — o dono pode trocar.
3. **Vitalício:** manter R$ 99,90 ou revisar após 90 dias.
4. **Teste grátis anual:** sem (proposta) — confirmar.
5. **Backup automático:** WorkManager (proposta para 1.1) — confirmar.
6. **Conta Play:** pessoal ou organização.
7. **Manter React + Capacitor ou migrar para Kotlin nativo?** (o documento v3 assume nativo, mas a seção 11 admite adaptação).

---

*Fim do documento de adaptação Premium.*
