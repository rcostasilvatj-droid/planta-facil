# Regras do projeto Planta Fácil

Este arquivo é lido pelo Claude Code ao abrir a pasta. Ele vale para qualquer trabalho neste repositório.

## Sobre o projeto e o dono

- Planta Fácil é um PWA de planta baixa: editor 2D, visualização 3D e cálculo de materiais. Veja o `README.md`.
- O dono e único mantenedor da versão oficial é Ricardo Silva. Ele está aprendendo programação (lógica e JavaScript).
- Responda sempre em português do Brasil, de forma clara e objetiva.
- Ao explicar código, ensine o raciocínio e o significado dos comandos com exemplos práticos, sem presumir que ele domina programação.
- Não concorde automaticamente. Questione decisões quando identificar riscos ou soluções melhores.

## Como o app é feito

- `index.html` contém o app inteiro (HTML, CSS e JavaScript), sem framework e sem etapa de build. Mantenha assim, a não ser que haja um motivo forte e o Ricardo aprove.
- `sw.js` é o service worker que guarda os arquivos para uso offline. `manifest.webmanifest`, `icons/` e `splash.webp` são do PWA.
- O 3D usa three.js r128, carregado do cdnjs e guardado pelo service worker.
- O estado inteiro do projeto fica no objeto `S` (`laje`, `walls`, `ops`, `stairs`, `furn`, `varanda`, `roof`, `mat`, `fundo`, `acab`, `nivel`, `outro`) e é salvo em `localStorage`. Não há servidor.
- Dois andares: `S.walls`, `S.ops` e `S.furn` são sempre do andar **em edição** (`S.nivel`: `'laje'` ou `'terreo'`); o outro andar fica em `S.outro`. Para algo que é sempre da laje (materiais, telhado, guarda-corpo), use `naLaje(fn)`; para ler um andar específico, `andar('laje')` ou `andar('terreo')`.
- A função `norm()` completa projetos antigos com os campos novos. Ao criar um campo novo em `S`, atualize `norm()` para não quebrar projetos já salvos nos aparelhos.
- Os backups ficam em `localStorage`, na chave terminada em `-backups`.

## Regras de alteração

1. Antes de alterar código, investigue o problema, entenda a arquitetura e identifique a causa.
2. Prefira soluções simples, seguras e fáceis de manter.
3. Evite alterações desnecessárias. Não reescreva partes que já funcionam sem justificativa.
4. Priorize estabilidade, integridade dos dados salvos e boa experiência no celular.
5. Um item por vez: mostre o resultado e espere a aprovação antes de começar o próximo.

## Git e publicação

- A branch `main` é a versão publicada pelo GitHub Pages. Tudo que entra nela vai para os usuários.
- Trabalhe em outra branch (por exemplo `dev`). Não faça merge na `main`, push na `main` nem deploy sem autorização explícita do Ricardo.
- A cada mudança em arquivo do app, aumente a versão do cache em `sw.js` (`planta-facil-v2` → `planta-facil-v3`...). Sem isso, os aparelhos com o app instalado não recebem a atualização.
- Mensagens de commit em português, dizendo o que mudou e por quê.

## Testes

- Teste antes de dizer que funciona. Suba um servidor local (`python3 -m http.server`) e use um navegador automático (Playwright) quando possível.
- Roteiro mínimo de regressão, a cada mudança:
  - desenhar uma parede, colocar porta, janela, escada e um móvel;
  - mover e editar um item pelo painel; desfazer e refazer;
  - abrir o 3D nas três vistas e selecionar um item nele;
  - abrir Materiais e conferir que os números mudam com as paredes;
  - exportar o projeto e abrir o arquivo em um navegador "limpo";
  - criar e restaurar um backup;
  - recarregar sem internet e conferir que o app e o projeto abrem.
- Teste também em tela de celular (412x860).
- Nunca invente resultados de testes, dados, preços ou ações que não foram verificadas.

## Como relatar o trabalho

- Diferencie sempre: sugestão, plano, código implementado e o que foi efetivamente testado.
- Informe claramente riscos, limitações, pendências e o que realmente foi executado.
- Documente decisões técnicas importantes no `README.md`.

## Cuidados específicos

- Os cálculos de materiais e de escada são estimativas para orçamento. O aviso de que não substituem um engenheiro deve continuar no app e no README.
- A arte (ícones e tela de abertura) é do Ricardo. Não troque sem ele pedir.
- O projeto é MIT. Antes de copiar código de outro repositório, confira a licença dele e mantenha o aviso de autoria. Registre no README qualquer código ou biblioteca de terceiros.
- Não inclua plantas de imóveis de terceiros, endereços ou dados pessoais em arquivos, exemplos ou issues.
