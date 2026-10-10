# Meu voto — 1º Turno 2026

Abra `index.html` ou `Abrir painel.cmd` com dois cliques. O painel funciona sem instalação e sem internet; os links de fontes precisam de conexão. Mantenha os arquivos desta pasta juntos.

## Resultado

A primeira tela mostra o resultado oficial do 1º turno, por estado e cargo, com votos, percentual e situação. A situação é o texto do TSE: eleito, eleito por quociente partidário, eleito por média, suplente, 2º turno ou não eleito. A apuração usada aqui está encerrada; os arquivos foram gerados em 05/10/2026.

Na lista, no diálogo de escolha e na colinha, cada candidato escolhido mostra os votos nominais do seu recorte (o estado, ou o Brasil na Presidência) e a situação. Quem não aparece no arquivo oficial fica sem número de votos. Isso não significa zero.

Para ver o boletim da sua urna, abra Consultar BU e informe a zona e a seção. O painel localiza o município no índice já salvo e, com internet, lê o arquivo oficial daquela urna. A seção agregada abre o boletim da seção principal. A zona e a seção ficam neste navegador. O título de eleitor não é pedido nem guardado. O boletim não fica gravado na pasta.

## Usar

1. Escolha o estado (SP, DF, RJ, MG ou RS) e depois o cargo. A Presidência é a mesma em todos. No Distrito Federal, o segundo cargo é deputado distrital.
2. Busque nome ou número e filtre por partido. O filtro inicial mostra os registros que constam na urna. “Todos os registros” também inclui renúncias e indeferimentos.
3. Clique em Escolher para preencher a colinha. No Senado, escolha a primeira ou a segunda vaga; o sistema impede repetir o candidato.
4. Imprima a colinha ou escolha Salvar como PDF na janela de impressão. O modelo impresso tem cerca de 9,5 cm de largura e segue a ordem dos cargos do TSE. Se o navegador interno não abrir a impressão, use “Baixar colinha para imprimir”, abra o HTML baixado no Edge/Chrome/Firefox e imprima lá. Esse HTML é independente e funciona offline.
5. Use “Baixar para Instagram · PNG 1080×1350” para gerar uma imagem vertical 4:5 na definição recomendada para publicação no feed. O arquivo é criado localmente, sem upload; a imagem inclui os seis cargos e os nomes escolhidos.
6. Use Salvar escolhas para guardar um JSON e Restaurar escolhas para recuperá-lo. As escolhas também ficam no armazenamento local do navegador. Ao trocar de navegador, de caminho ou entre endereço local e arquivo, restaure o JSON.

O treino é simplificado: não reproduz todas as regras da urna oficial, não implementa voto de legenda e não grava votos em qualquer sistema eleitoral. Reiniciar treino conserva a colinha até que novas escolhas substituam as anteriores. Há um link para o simulador oficial.

## Dados

- `Lista de candidatos.md`: nome, partido, número e situação dos 8.040 registros de SP, DF, RJ, MG, RS e da Presidência.
- `candidatos.json`: dados mínimos das candidaturas, procedência e hashes dos arquivos originais.
- `pesquisas.json`: três cenários de primeiro turno, de dois levantamentos Quaest; governo e Senado de SP (29/09), Presidência nacional (28/09). Governo e Senado só aparecem com São Paulo selecionado.
- `dados.js` e `pesquisas.js`: cópias utilizadas pelo painel para funcionar mesmo aberto diretamente como arquivo.
- `resultados.js`: votos e situação do 1º turno, gerados por `preparar_resultados.py` a partir da divulgação oficial.
- `secoes.js`: índice de zona e seção de SP, DF, RJ, MG e RS, para localizar o boletim. O arquivo da urna em si é lido na hora.
- `candidatos-tse.zip` e `situacoes-tse.zip`: arquivos oficiais originais para auditoria. Não são necessários para abrir o painel. Contêm registros nacionais e documentação do TSE; apenas o recorte necessário foi incluído no JSON.
- `preparar_dados.py`: reconstrói o JSON, JavaScript e Markdown a partir dos dois ZIPs locais. Usa apenas a biblioteca padrão do Python.

Consulta em 01/10/2026. Não há atualização automática. A situação pode mudar após a extração; consulte o link TSE de cada registro antes de finalizar sua colinha. As pesquisas são uma seleção identificada, não todas as pesquisas nem previsão de resultado. Não cadastramos pesquisa de deputados: falta de dado não é 0%.

Os arquivos de candidaturas foram lidos em Latin-1, delimitados por ponto e vírgula, e unidos aos dados complementares por SQ_CANDIDATO. Usamos DS_SITUACAO_JULGAMENTO para situação, ST_CANDIDATO_INSERIDO_URNA para presença na urna e NM_TIPO_DESTINACAO_VOTOS para destinação. Vice e suplentes não são escolhas separadas e não aparecem nesta lista. Todos os registros dos titulares foram preservados, inclusive substituídos e fora da urna.

As propostas disponíveis no catálogo do TSE estavam em PDF. Não baixamos pacotes de propostas; nenhum conteúdo de propostas foi inventado ou convertido. Os ZIPs de dados podem conter documentação técnica em PDF do próprio TSE.

## Local de votação

O seletor de estado define deputado federal, deputado estadual (distrital no DF), senador e governador. A Presidência permanece nacional. O recorte vale para toda a unidade da federação: em SP, é o mesmo para a capital e para São José dos Campos. O endereço onde você reside não altera sua seção automaticamente. Consulte o local cadastrado no TSE, inclusive se houve transferência temporária. O painel não consulta nem armazena seu número de título. Ao trocar de estado, escolhas estaduais de outra unidade saem da colinha.

## Fontes

- https://dadosabertos.tse.jus.br/dataset/candidatos-2026
- https://resultados.tse.jus.br/oficial/ele2026/
- https://www.tse.jus.br/eleicoes/simulador-de-votacao
- https://www.tse.jus.br/comunicacao/noticias/2026/Marco/eleicoes-2026-conheca-a-ordem-de-votacao-na-urna-eletronica
- https://noticias.uol.com.br/eleicoes/2026/09/29/quaest-sp-governo-e-senado.amp.htm
- https://noticias.uol.com.br/eleicoes/2026/09/28/quaest-pesquisa-presidencial.ghtm
- https://quaest.com.br/relatorios/

Aplicação pessoal, local e independente, sem vínculo com a Justiça Eleitoral. Nenhuma preferência é pré-selecionada. Candidatos são apresentados em ordem alfabética; gráficos mantêm a ordem de publicação da pesquisa.
