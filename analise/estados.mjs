'use strict';

export const ESTADOS = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo',
  TO: 'Tocantins', ZZ: 'Exterior',
};

export const REGIOES = {
  N: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  NE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  CO: ['DF', 'GO', 'MS', 'MT'],
  SE: ['ES', 'MG', 'RJ', 'SP'],
  S: ['PR', 'RS', 'SC'],
  EXTERIOR: ['ZZ'],
};

export const REGIAO_NOME = {
  N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul', EXTERIOR: 'Exterior',
};

const UF_PARA_REGIAO = Object.fromEntries(
  Object.entries(REGIOES).flatMap(([regiao, ufs]) => ufs.map((uf) => [uf, regiao])),
);

export function regiaoDaUf(uf) {
  return UF_PARA_REGIAO[String(uf).toUpperCase()] || null;
}

export function nomeEstado(uf) {
  return ESTADOS[String(uf).toUpperCase()] || uf;
}
