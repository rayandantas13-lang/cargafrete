# 🚚 FreteControl - Google Sheets como Banco

Sistema de controle de frete e cargas da Grande Goiânia. **100% no GitHub Pages**, sem Docker, sem Postgres. Usa **Google Sheets como banco de dados** + localStorage.

## ✨ Funcionalidades

- **📊 Dashboard** - visão geral por região
- **➕ Novo Frete** - OC, motorista, placa, toneladas, cálculo automático por região (Goiânia mais barato, Trindade, Senador Canedo, Goianira, Abadia)
  - Valor muda após 7 entregas
  - Locais de entrega opcionais com distância, ordenação do mais perto para o mais longe
  - Anexos PDF/fotos da OC
- **🚛 Fretes** - lista, filtros, editar status
- **🗺️ Rotas** - gera rota otimizada e abre no Google Maps (motorista pode mudar ordem)
- **👤 Motoristas** - cadastro simples
- **⚙️ Admin** - senha protegida, configura valores e Google Sheets

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
