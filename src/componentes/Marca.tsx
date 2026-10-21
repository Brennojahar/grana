import gClaro from '../assets/marca/g-claro.svg';
import gEscuro from '../assets/marca/g-escuro.svg';
import granaClaro from '../assets/marca/grana-claro.svg';
import granaEscuro from '../assets/marca/grana-escuro.svg';

const ARQUIVOS = {
  g: { escuro: gEscuro, claro: gClaro },
  grana: { escuro: granaEscuro, claro: granaClaro },
};

/** A carteira do grana. Segue o tema do sistema, como o resto do app. */
export function Marca({ tipo = 'g', tamanho }: { tipo?: keyof typeof ARQUIVOS; tamanho: number }) {
  const { escuro, claro } = ARQUIVOS[tipo];
  return (
    <picture className="marca">
      <source srcSet={claro} media="(prefers-color-scheme: light)" />
      <img src={escuro} width={tamanho} height={tamanho} alt="" />
    </picture>
  );
}
