# 🚚 FreteControl - Google Sheets como Banco

Sistema de controle de frete e cargas da Grande Goiânia. **100% no GitHub Pages**, sem Docker, sem Postgres. Usa **Google Sheets como banco de dados** + localStorage.

## ✨ Funcionalidades

- **📊 Dashboard** - visão geral por região
- **➕ Novo Frete** - OC, motorista, placa, toneladas e dois **tipos de frete**:
  - **📊 Padrão**: cálculo automático pelas tarifas de cada município (cada cidade com seu valor por entrega, seu limite X e seu valor extra acima de X)
  - **🤝 Combinado**: valor negociado digitado manualmente (destinos longe como Brasília, Anápolis, Mato Grosso)
  - Locais de entrega opcionais com distância, ordenação do mais perto para o mais longe
  - Anexos PDF/fotos da OC
- **🚛 Fretes** - lista, filtros, editar status
- **🗺️ Rotas** - gera rota otimizada e abre no Google Maps (motorista pode mudar ordem)
- **👤 Motoristas** - cadastro simples
- **⚙️ Admin** - senha protegida, configura valores, Google Sheets e **gerencia municípios** (adicionar/remover cidades, valor por entrega, limite X e valor extra de cada uma, e marcar destinos "combinado")

## 🗄️ Banco de Dados: Google Sheets

### Opção 1 - Mais simples (só precisa da planilha)
1. Crie planilha no Google Sheets, copie ID da URL
2. Ative Sheets API em console.cloud.google.com e crie API Key
3. Cole API Key e Spreadsheet ID no Admin
4. Clique em "Sincronizar da Planilha"

### Opção 2 - Completa (recomendada - escrita total)
1. Na planilha: Extensões > Apps Script
2. Cole o código que está no Admin (detalhes lá)
3. Implantar > Nova implantação > App da Web > Acesso: Qualquer pessoa > Implantar
4. Copie URL gerada e cole no campo API Key no Admin
5. Agora salva direto na planilha!

### Opção 3 - Sem planilha
Deixa vazio. Dados ficam só no navegador. Use Exportar/Importar JSON.

### 🔧 Pré-configurar via Variáveis de Ambiente (recomendado para vários dispositivos)

Para não precisar digitar a URL do Apps Script e o ID da planilha em **cada aparelho**
(celular, tablet, computador de funcionário), esses valores podem ser embutidos no build
usando variáveis de ambiente públicas do Next.js (`NEXT_PUBLIC_...`). Como são compiladas
no build, **qualquer dispositivo** que abrir o site já carrega a conexão automaticamente.
Se um campo for preenchido manualmente no Admin, ele tem prioridade sobre a variável.

**No GitHub Pages (deploy deste projeto):** o build roda no GitHub Actions, então:

1. No repositório: **Settings → Secrets and variables → Actions → Variables**
2. Clique em **New repository variable** e crie:
   - `NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY` = URL do Apps Script (termina em `/exec`)
   - `NEXT_PUBLIC_SPREADSHEET_ID` = ID da planilha
3. Garanta que o passo de build do `.github/workflows/deploy.yml` repassa essas
   variáveis (bloco `env:` abaixo). Se ainda não estiver, adicione:

   ```yaml
         - name: 🏗️ Build estático para GitHub Pages
           run: npm run build
           env:
             GITHUB_PAGES: "true"
             NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY: ${{ vars.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY }}
             NEXT_PUBLIC_SPREADSHEET_ID: ${{ vars.NEXT_PUBLIC_SPREADSHEET_ID }}
   ```

4. Faça um novo push (ou rode o workflow manualmente) — o site publicado já sai
   configurado em qualquer dispositivo.

**Rodando local:** copie [`.env.example`](.env.example) para `.env.local` e preencha:

```env
NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY="https://script.google.com/macros/s/SUA_URL/exec"
NEXT_PUBLIC_SPREADSHEET_ID="SEU_SPREADSHEET_ID"
```

## 🚀 Deploy no GitHub (100%)

O projeto já está configurado para GitHub Pages com `output: export`.

**1. Subir para GitHub:**
```bash
git add .
git commit -m "fretecontrol sheets"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/fretecontrol.git
git push -u origin main
```

**2. Ativar Pages:**
- No GitHub: Settings > Pages > Build and deployment > Source: **GitHub Actions**
- O workflow `deploy.yml` vai fazer deploy automaticamente a cada push

**3. Acessar:**
- Seu site estará em `https://SEU_USUARIO.github.io/fretecontrol/`
- Se seu repo for `username.github.io`, já funciona na raiz

## 💻 Rodar local

```bash
npm install
npm run dev
# http://localhost:3000
```

## 🔐 Senha Admin

Padrão: `admin123` - mude no Admin

## 📦 Tecnologias

- Next.js 16 com output export (estático)
- Tailwind
- localStorage + Google Sheets (sem backend)
- Google Maps links

Sem Docker, sem Postgres, sem complicação. Só GitHub + Sheets.
