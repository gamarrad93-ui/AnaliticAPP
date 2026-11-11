/**
 * Pequeño intérprete de fórmulas matemáticas (sin usar eval, por seguridad).
 * Soporta: + − * / ^, paréntesis, números con coma o punto decimal (dentro de la fórmula
 * usar PUNTO, ya que la coma separa argumentos), variables con letras/dígitos/_,
 * funciones: sqrt, ln, log (base 10), exp, abs, sin, cos, tan, pow(a,b), y constantes pi, e.
 */

type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'neg'; a: Node }
  | { t: 'fn'; name: string; args: Node[] };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  pow: Math.pow,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export class ParseError extends Error {}

function tokenize(src: string): string[] {
  const tokens: string[] = [];
  const s = src.replace(/×|·/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (s[j] === 'e' || s[j] === 'E') {
        let k = j + 1;
        if (s[k] === '+' || s[k] === '-') k++;
        if (/[0-9]/.test(s[k] ?? '')) {
          j = k;
          while (j < s.length && /[0-9]/.test(s[j])) j++;
        }
      }
      tokens.push(s.slice(i, j));
      i = j;
    } else if (/[A-Za-z_áéíóúñÁÉÍÓÚÑ]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_áéíóúñÁÉÍÓÚÑ]/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
    } else if ('+-*/^(),'.includes(c)) {
      tokens.push(c);
      i++;
    } else {
      throw new ParseError(`Carácter no reconocido: "${c}"`);
    }
  }
  return tokens;
}

/** Analiza la fórmula y devuelve un árbol. Gramática con precedencia usual (^ asocia a la derecha). */
export function parseExpression(src: string): Node {
  const tk = tokenize(src);
  let p = 0;
  const peek = () => tk[p];
  const eat = (x?: string) => {
    const t = tk[p];
    if (x != null && t !== x) throw new ParseError(`Se esperaba "${x}"${t ? ` y se encontró "${t}"` : ' al final'}`);
    p++;
    return t;
  };
  function expr(): Node {
    let n = term();
    while (peek() === '+' || peek() === '-') {
      const op = eat() as '+' | '-';
      n = { t: 'bin', op, a: n, b: term() };
    }
    return n;
  }
  function term(): Node {
    let n = unary();
    while (peek() === '*' || peek() === '/') {
      const op = eat() as '*' | '/';
      n = { t: 'bin', op, a: n, b: unary() };
    }
    return n;
  }
  function unary(): Node {
    if (peek() === '-') {
      eat();
      return { t: 'neg', a: unary() };
    }
    if (peek() === '+') {
      eat();
      return unary();
    }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (peek() === '^') {
      eat();
      return { t: 'bin', op: '^', a: base, b: unary() };
    }
    return base;
  }
  function atom(): Node {
    const t = peek();
    if (t == null) throw new ParseError('La fórmula está incompleta.');
    if (t === '(') {
      eat('(');
      const n = expr();
      eat(')');
      return n;
    }
    if (/^[0-9.]/.test(t)) {
      eat();
      const v = Number(t);
      if (!Number.isFinite(v)) throw new ParseError(`Número inválido: "${t}"`);
      return { t: 'num', v };
    }
    if (/^[A-Za-z_áéíóúñÁÉÍÓÚÑ]/.test(t)) {
      eat();
      if (peek() === '(') {
        const name = t.toLowerCase();
        if (!FUNCS[name]) throw new ParseError(`Función desconocida: "${t}"`);
        eat('(');
        const args: Node[] = [expr()];
        while (peek() === ',') {
          eat(',');
          args.push(expr());
        }
        eat(')');
        return { t: 'fn', name, args };
      }
      return { t: 'var', name: t };
    }
    throw new ParseError(`Símbolo inesperado: "${t}"`);
  }
  const n = expr();
  if (p < tk.length) throw new ParseError(`Sobra algo en la fórmula a partir de "${tk[p]}"`);
  return n;
}

/** Nombres de variables usados (sin constantes). */
export function variablesOf(n: Node, acc = new Set<string>()): Set<string> {
  if (n.t === 'var' && !(n.name in CONSTS)) acc.add(n.name);
  if (n.t === 'bin') {
    variablesOf(n.a, acc);
    variablesOf(n.b, acc);
  }
  if (n.t === 'neg') variablesOf(n.a, acc);
  if (n.t === 'fn') n.args.forEach((a) => variablesOf(a, acc));
  return acc;
}

export function evaluate(n: Node, vars: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v;
    case 'var':
      if (n.name in vars) return vars[n.name];
      if (n.name in CONSTS) return CONSTS[n.name];
      throw new ParseError(`Falta el valor de "${n.name}"`);
    case 'neg':
      return -evaluate(n.a, vars);
    case 'fn':
      return FUNCS[n.name](...n.args.map((a) => evaluate(a, vars)));
    case 'bin': {
      const a = evaluate(n.a, vars);
      const b = evaluate(n.b, vars);
      switch (n.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '^':
          return Math.pow(a, b);
      }
    }
  }
}
